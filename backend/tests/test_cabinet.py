"""Biznes kabineti (ADR-0015): egalik, takliflar va moderatsiya. Har bir javob kontraktga qarshi.

Ega va administrator — alohida klientlar: ikkalasi ham `csrftoken` cookie'sini ishlatadi.
"""

import io
import json
from collections.abc import Iterator
from datetime import timedelta
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client
from django.utils import timezone
from PIL import Image

from apps.accounts.models import User
from apps.accounts.sessions import create_session, hash_token
from apps.businesses.models import Business, BusinessPhoto, Item
from apps.cabinet.models import BusinessChange, BusinessMembership, ChangeUpload, OwnerInvite
from apps.community.models import Review
from apps.staff.models import AuditEntry
from tests.admin_api import AdminClient
from tests.contract import assert_matches_contract
from tests.factories import make_admin, make_business, make_item, make_user, publishable

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def media_root(settings: Any, tmp_path: Path) -> Path:
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture(autouse=True)
def revalidated() -> Iterator[MagicMock]:
    with patch("apps.businesses.admin_views.revalidate") as mock:
        yield mock


class Owner:
    """Mijoz sessiyasi (cookie va CSRF) — o'z klienti bilan."""

    def __init__(self, user: User | None = None) -> None:
        self.client = Client()
        self.user = user or make_user()
        token, session = create_session(self.user)
        self.csrf = session.csrf_token
        self.client.cookies["sessionid"] = token
        self.client.cookies["csrftoken"] = session.csrf_token

    def call(self, method: str, path: str, body: Any = None) -> Any:
        headers = {} if method == "GET" else {"X-CSRFToken": self.csrf}
        response = self.client.generic(
            method,
            f"/api/v1{path}",
            data="" if body is None else json.dumps(body),
            content_type="application/json",
            headers=headers,
        )
        assert_matches_contract(response)
        return response

    def upload(self, business: Business, content: bytes | None = None) -> Any:
        response = self.client.post(
            f"/api/v1/cabinet/businesses/{business.id}/uploads",
            {"file": SimpleUploadedFile("rasm.jpg", content or jpeg(), content_type="image/jpeg")},
            headers={"X-CSRFToken": self.csrf},
        )
        assert_matches_contract(response)
        return response


def jpeg(width: int = 800, height: int = 400) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (20, 120, 110)).save(buffer, format="JPEG")
    return buffer.getvalue()


def admin(*permissions: str, root: bool = False) -> AdminClient:
    return AdminClient(Client(), make_admin(is_root=root, extra_permissions=list(permissions)))


def owner_of(business: Business) -> Owner:
    owner = Owner()
    BusinessMembership.objects.create(user=owner.user, business=business)
    return owner


def published(**fields: Any) -> Business:
    return make_business(
        **publishable(phones=[{"number": "+998901234567", "label": None}], **fields)
    )


def propose(owner: Owner, business: Business, body: dict[str, Any]) -> Any:
    return owner.call("POST", f"/cabinet/businesses/{business.id}/changes", body)


def pending(business: Business) -> list[BusinessChange]:
    return list(BusinessChange.objects.filter(business=business, status="pending"))


ITEM: dict[str, Any] = {
    "kind": "service",
    "name": "Soqol olish",
    "group": None,
    "description": None,
    "price": {"type": "fixed", "min": {"amount": 3_000_000, "currency": "UZS"}, "max": None},
    "durationMinutes": 20,
    "attributes": [],
    "isAvailable": True,
}


# --- Taklif havolasi va egalik ---


def test_invite_flow_one_time_and_hashed() -> None:
    business = published()
    root = admin(root=True)
    created = root.call("POST", f"/admin/businesses/{business.id}/owner-invite")
    assert created.status_code == 201
    url = created.json()["url"]
    assert "/kabinet/qoshilish#" in url  # token fragmentda — server loglariga tushmaydi
    token = url.split("#", 1)[1]
    assert created.json()["qrDataUri"].startswith("data:image/svg+xml;base64,")
    invite = OwnerInvite.objects.get(business=business)
    assert invite.token_hash == hash_token(token)
    assert token not in invite.token_hash
    assert invite.expires_at - timezone.now() > timedelta(days=6)

    status = root.call("GET", f"/admin/businesses/{business.id}/owners").json()
    assert status["owners"] == []
    assert status["invite"] is not None
    assert status["maxOwners"] == 3

    owner = Owner()
    accepted = owner.call("POST", "/cabinet/invites/accept", {"token": token})
    assert accepted.status_code == 200
    assert accepted.json()["id"] == str(business.id)
    assert BusinessMembership.objects.filter(user=owner.user, business=business).exists()
    assert not OwnerInvite.objects.filter(business=business).exists()  # bir martalik
    assert AuditEntry.objects.filter(action="membership.accept").exists()

    # Ikkinchi odam xuddi shu havola bilan — yo'q
    stranger = Owner()
    assert stranger.call("POST", "/cabinet/invites/accept", {"token": token}).status_code == 404
    owners = root.call("GET", f"/admin/businesses/{business.id}/owners").json()
    assert owners["invite"] is None
    assert len(owners["owners"]) == 1
    assert owners["owners"][0]["provider"] == "telegram"


def test_existing_owner_does_not_spend_new_invite() -> None:
    business = published()
    owner = owner_of(business)
    token = admin(root=True).call("POST", f"/admin/businesses/{business.id}/owner-invite")
    token_value = token.json()["url"].split("#", 1)[1]
    assert owner.call("POST", "/cabinet/invites/accept", {"token": token_value}).status_code == 200
    assert OwnerInvite.objects.filter(business=business).exists()


def test_invite_expired_or_invalid() -> None:
    business = published()
    token = admin(root=True).call("POST", f"/admin/businesses/{business.id}/owner-invite")
    token_value = token.json()["url"].split("#", 1)[1]
    OwnerInvite.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    owner = Owner()
    assert owner.call("POST", "/cabinet/invites/accept", {"token": token_value}).status_code == 404
    assert owner.call("POST", "/cabinet/invites/accept", {"token": "x"}).status_code == 400


def test_owner_limit() -> None:
    business = published()
    for _ in range(3):
        owner_of(business)
    root = admin(root=True)
    response = root.call("POST", f"/admin/businesses/{business.id}/owner-invite")
    assert response.status_code == 409
    assert response.json()["code"] == "owner_limit"


def test_invite_requires_owners_permission() -> None:
    business = published()
    viewer = admin("business.view", "business.edit")
    assert viewer.call("POST", f"/admin/businesses/{business.id}/owner-invite").status_code == 403
    assert viewer.call("GET", f"/admin/businesses/{business.id}/owners").status_code == 200
    manager = admin("business.view", "business.owners")
    assert manager.call("POST", f"/admin/businesses/{business.id}/owner-invite").status_code == 201
    assert (
        manager.call("DELETE", f"/admin/businesses/{business.id}/owner-invite").status_code == 204
    )
    assert (
        manager.call("DELETE", f"/admin/businesses/{business.id}/owner-invite").status_code == 404
    )


# --- Izolyatsiya: boshqa biznes ko'rinmaydi va o'zgarmaydi (ADR-0009, 6-qoida) ---


def test_cabinet_isolation() -> None:
    mine, theirs = published(), published()
    owner = owner_of(mine)
    other = owner_of(theirs)
    change = propose(other, theirs, {"kind": "profile", "profile": {"description": "Begona"}})
    change_id = change.json()["id"]
    upload_id = other.upload(theirs).json()["id"]

    base = f"/cabinet/businesses/{theirs.id}"
    for method, path, body in [
        ("GET", base, None),
        ("GET", f"{base}/stats", None),
        ("GET", f"{base}/changes", None),
        ("POST", f"{base}/changes", {"kind": "profile", "profile": {"description": "X"}}),
        ("POST", f"{base}/changes/{change_id}/withdraw", None),
        ("GET", f"{base}/uploads/{upload_id}", None),
        ("DELETE", f"{base}/membership", None),
    ]:
        response = owner.call(method, path, body)
        assert response.status_code == 404, (method, path, response.content)
    assert owner.upload(theirs).status_code == 404
    # O'z biznesi orqali boshqa biznesning taklifi yoki rasmiga ham yetib bo'lmaydi
    mine_base = f"/cabinet/businesses/{mine.id}"
    assert owner.call("POST", f"{mine_base}/changes/{change_id}/withdraw").status_code == 404
    assert owner.call("GET", f"{mine_base}/uploads/{upload_id}").status_code == 404
    listed = owner.call("GET", "/cabinet/businesses").json()
    assert [b["id"] for b in listed] == [str(mine.id)]
    assert BusinessChange.objects.get(pk=change_id).status == "pending"


def test_owner_sees_business_without_private_fields() -> None:
    business = published(description="Eski tavsif")
    make_item(business=business)
    owner = owner_of(business)
    data = owner.call("GET", f"/cabinet/businesses/{business.id}").json()
    assert data["description"] == "Eski tavsif"
    assert len(data["items"]) == 1
    assert "consent" not in data
    assert "publishedAt" not in data


# --- Profil takliflari ---


def test_profile_change_waits_for_approval(revalidated: MagicMock) -> None:
    business = published(description="Eski")
    owner = owner_of(business)
    response = propose(
        owner,
        business,
        {
            "kind": "profile",
            "profile": {
                "description": "Yangi tavsif",
                "telegram": "@baraka_soch",
                "name": business.name,
            },
        },
    )
    assert response.status_code == 201
    change = response.json()
    assert change["status"] == "pending"
    # O'zgarmagan maydon (nom) taklifga kirmaydi; @ olib tashlanadi (admin qoidalari)
    assert change["fields"] == ["description", "telegram"]
    business.refresh_from_db()
    assert business.description == "Eski"
    revalidated.assert_not_called()

    reviewer = admin("change.review")
    queue = reviewer.call("GET", "/admin/changes?status=pending").json()
    assert queue["total"] == 1
    assert queue["items"][0]["important"] is False
    detail = reviewer.call("GET", f"/admin/changes/{change['id']}").json()
    fields = {f["field"]: f for f in detail["fields"]}
    assert fields["telegram"]["after"] == "baraka_soch"
    assert fields["telegram"]["before"] is None
    assert fields["description"]["conflict"] is False

    approved = reviewer.call("POST", f"/admin/changes/{change['id']}/approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"
    business.refresh_from_db()
    assert business.description == "Yangi tavsif"
    assert business.telegram == "baraka_soch"
    assert AuditEntry.objects.filter(action="change.approve", target_id=change["id"]).exists()
    revalidated.assert_called()
    assert reviewer.call("POST", f"/admin/changes/{change['id']}/approve").status_code == 409

    mine = owner.call("GET", f"/cabinet/businesses/{business.id}/changes").json()
    assert mine[0]["status"] == "approved"
    assert mine[0]["reviewedAt"] is not None


def test_profile_validation_uses_admin_rules() -> None:
    business = published()
    owner = owner_of(business)
    bad_phone = propose(
        owner, business, {"kind": "profile", "profile": {"phones": [{"number": "123"}]}}
    )
    assert bad_phone.status_code == 400
    assert "phones" in bad_phone.json()["fields"]
    # Holat, rozilik — egaga yopiq maydonlar
    for forbidden in ({"status": "hidden"}, {"consent": None}):
        response = propose(owner, business, {"kind": "profile", "profile": forbidden})
        assert response.status_code == 400
    unchanged = propose(owner, business, {"kind": "profile", "profile": {"name": business.name}})
    assert unchanged.status_code == 400
    assert propose(owner, business, {"kind": "nimadir"}).status_code == 400
    assert pending(business) == []


def test_important_fields_and_conflict() -> None:
    business = published(description="Boshlang'ich")
    owner = owner_of(business)
    change = propose(
        owner,
        business,
        {"kind": "profile", "profile": {"name": "Yangi nom", "description": "Ega tavsifi"}},
    ).json()
    reviewer = admin("change.review", "business.view", "business.edit")
    # Moderator taklifdan keyin tavsifni o'zi o'zgartirdi — ziddiyat
    reviewer.call("PATCH", f"/admin/businesses/{business.id}", {"description": "Admin tavsifi"})
    listed = reviewer.call("GET", "/admin/changes?status=pending").json()["items"][0]
    assert listed["important"] is True
    assert listed["conflict"] is True
    fields = {
        f["field"]: f
        for f in reviewer.call("GET", f"/admin/changes/{change['id']}").json()["fields"]
    }
    assert fields["name"]["important"] is True
    assert fields["name"]["conflict"] is False
    assert fields["description"]["conflict"] is True
    assert fields["description"]["current"] == "Admin tavsifi"


def test_new_proposal_supersedes_previous() -> None:
    business = published()
    owner = owner_of(business)
    first = propose(owner, business, {"kind": "profile", "profile": {"description": "1"}}).json()
    second = propose(owner, business, {"kind": "profile", "profile": {"description": "2"}}).json()
    assert BusinessChange.objects.get(pk=first["id"]).status == "superseded"
    assert [c.id for c in pending(business)] == [BusinessChange.objects.get(pk=second["id"]).id]


def test_reject_requires_reason_and_owner_sees_it() -> None:
    business = published()
    owner = owner_of(business)
    change = propose(
        owner, business, {"kind": "profile", "profile": {"description": "Spam"}}
    ).json()
    reviewer = admin("change.review")
    path = f"/admin/changes/{change['id']}/reject"
    assert reviewer.call("POST", path, {"reason": ""}).status_code == 400
    rejected = reviewer.call("POST", path, {"reason": "Reklama matni"})
    assert rejected.status_code == 200
    assert rejected.json()["rejectionReason"] == "Reklama matni"
    mine = owner.call("GET", f"/cabinet/businesses/{business.id}/changes").json()[0]
    assert mine["status"] == "rejected"
    assert mine["rejectionReason"] == "Reklama matni"
    assert reviewer.call("POST", path, {"reason": "Yana"}).status_code == 409


def test_review_permission_required() -> None:
    business = published()
    owner = owner_of(business)
    change = propose(owner, business, {"kind": "profile", "profile": {"description": "A"}}).json()
    editor = admin("business.view", "business.edit", "business.publish")
    assert editor.call("GET", "/admin/changes").status_code == 403
    assert editor.call("POST", f"/admin/changes/{change['id']}/approve").status_code == 403


def test_withdraw() -> None:
    business = published()
    owner = owner_of(business)
    change = propose(owner, business, {"kind": "profile", "profile": {"description": "A"}}).json()
    path = f"/cabinet/businesses/{business.id}/changes/{change['id']}/withdraw"
    # Ikkinchi ega taklifni ko'radi, lekin u o'ziniki emas — qaytarib ololmaydi
    other = owner_of(business)
    listed = other.call("GET", f"/cabinet/businesses/{business.id}/changes").json()
    assert [c["mine"] for c in listed] == [False]
    assert other.call("POST", path).status_code == 404
    assert change["mine"] is True
    assert owner.call("POST", path).json()["status"] == "withdrawn"
    assert owner.call("POST", path).status_code == 409


def test_pending_limit() -> None:
    business = published()
    owner = owner_of(business)
    for n in range(20):
        response = propose(
            owner,
            business,
            {"kind": "item.create", "item": {**ITEM, "name": f"Xizmat {n}"}, "photos": []},
        )
        assert response.status_code == 201
    extra = propose(owner, business, {"kind": "item.create", "item": ITEM, "photos": []})
    assert extra.status_code == 409
    assert extra.json()["code"] == "too_many_pending"


# --- Katalog va rasmlar ---


def test_item_create_with_photo(media_root: Path, django_capture_on_commit_callbacks: Any) -> None:
    business = published()
    owner = owner_of(business)
    upload = owner.upload(business)
    assert upload.status_code == 201
    upload_id = upload.json()["id"]
    stored = ChangeUpload.objects.get(pk=upload_id)
    assert str(stored.file.name).startswith("pending/")  # ochiq papkaga tushmaydi
    preview = owner.client.get(upload.json()["previewUrl"])
    assert preview.status_code == 200
    assert preview["Cache-Control"] == "private, no-store"

    change = propose(
        owner,
        business,
        {"kind": "item.create", "item": ITEM, "photos": [{"uploadId": upload_id, "alt": "Soqol"}]},
    ).json()
    assert "photos" in change["fields"]
    assert "item.price" in change["fields"]
    reviewer = admin("change.review")
    detail = reviewer.call("GET", f"/admin/changes/{change['id']}").json()
    photos = next(f for f in detail["fields"] if f["field"] == "photos")
    assert photos["after"][0]["new"] is True
    admin_preview = reviewer.client.get(photos["after"][0]["url"])
    assert admin_preview.status_code == 200
    # Admin rasmni faqat change.review bilan ko'radi
    assert admin("business.view").client.get(photos["after"][0]["url"]).status_code in (403, 401)

    with django_capture_on_commit_callbacks(execute=True):
        reviewer.call("POST", f"/admin/changes/{change['id']}/approve")
    item = Item.objects.get(business=business, name="Soqol olish")
    assert item.price_min == 3_000_000
    assert item.photos.count() == 1
    photo = item.photos.get()
    assert not str(photo.file.name).startswith("pending/")
    assert photo.alt == "Soqol"
    assert not ChangeUpload.objects.filter(pk=upload_id).exists()
    assert not (media_root / str(stored.file.name)).exists()


def test_item_update_and_delete() -> None:
    business = published()
    item = make_item(business=business, name="Soch olish")
    owner = owner_of(business)
    reviewer = admin("change.review")
    unchanged = propose(
        owner,
        business,
        {
            "kind": "item.update",
            "itemId": str(item.id),
            "item": {
                **ITEM,
                "name": "Soch olish",
                "price": {
                    "type": "fixed",
                    "min": {"amount": 5_000_000, "currency": "UZS"},
                    "max": None,
                },
                "durationMinutes": None,
            },
            "photos": [],
        },
    )
    assert unchanged.status_code == 400  # hech narsa o'zgarmagan
    update = propose(
        owner,
        business,
        {
            "kind": "item.update",
            "itemId": str(item.id),
            "item": {**ITEM, "name": "Soch olish"},
            "photos": [],
        },
    ).json()
    assert "item.price" in update["fields"]
    assert "item.name" not in update["fields"]
    reviewer.call("POST", f"/admin/changes/{update['id']}/approve")
    item.refresh_from_db()
    assert item.price_min == 3_000_000

    removal = propose(owner, business, {"kind": "item.delete", "itemId": str(item.id)}).json()
    reviewer.call("POST", f"/admin/changes/{removal['id']}/approve")
    assert not Item.objects.filter(pk=item.id).exists()


def test_item_deleted_before_approval() -> None:
    business = published()
    item = make_item(business=business)
    owner = owner_of(business)
    change = propose(owner, business, {"kind": "item.delete", "itemId": str(item.id)}).json()
    item.delete()
    response = admin("change.review").call("POST", f"/admin/changes/{change['id']}/approve")
    assert response.status_code == 409
    assert response.json()["code"] == "target_missing"


def test_business_photos_change(media_root: Path) -> None:
    business = published()
    first = BusinessPhoto.objects.create(
        business=business, file="biz/a.webp", width=800, height=400
    )
    BusinessPhoto.objects.create(
        business=business, file="biz/b.webp", width=800, height=400, position=1
    )
    owner = owner_of(business)
    upload_id = owner.upload(business).json()["id"]
    # Yangi rasm birinchi, "a" qoladi, "b" olib tashlanadi
    change = propose(
        owner,
        business,
        {
            "kind": "photos",
            "photos": [{"uploadId": upload_id}, {"photoId": str(first.id), "alt": "Kirish"}],
        },
    ).json()
    admin("change.review").call("POST", f"/admin/changes/{change['id']}/approve")
    photos = list(business.photos.all())
    assert len(photos) == 2
    assert photos[1].id == first.id
    assert photos[1].alt == "Kirish"
    assert str(photos[0].file.name).startswith("businesses/") or not str(
        photos[0].file.name
    ).startswith("pending/")


def test_photo_refs_validated() -> None:
    business, other = published(), published()
    owner = owner_of(business)
    foreign_photo = BusinessPhoto.objects.create(
        business=other, file="biz/c.webp", width=800, height=400
    )
    response = propose(
        owner, business, {"kind": "photos", "photos": [{"photoId": str(foreign_photo.id)}]}
    )
    assert response.status_code == 400
    foreign_upload = owner_of(other).upload(other).json()["id"]
    response = propose(
        owner, business, {"kind": "photos", "photos": [{"uploadId": foreign_upload}]}
    )
    assert response.status_code == 400


def test_upload_rejects_non_image() -> None:
    business = published()
    owner = owner_of(business)
    assert owner.upload(business, b"not an image").status_code == 400


# --- Egalik tugashi, sharh, tozalash ---


def test_leaving_and_removal_withdraw_pending() -> None:
    business = published()
    owner = owner_of(business)
    change = propose(owner, business, {"kind": "profile", "profile": {"description": "A"}}).json()
    assert owner.call("DELETE", f"/cabinet/businesses/{business.id}/membership").status_code == 204
    assert BusinessChange.objects.get(pk=change["id"]).status == "withdrawn"

    second = owner_of(business)
    propose(second, business, {"kind": "profile", "profile": {"description": "B"}})
    membership = BusinessMembership.objects.get(user=second.user)
    root = admin(root=True)
    path = f"/admin/businesses/{business.id}/owners/{membership.id}"
    assert root.call("DELETE", path).status_code == 204
    assert pending(business) == []
    assert second.call("GET", f"/cabinet/businesses/{business.id}").status_code == 404


def test_owner_cannot_review_own_business() -> None:
    business = published()
    owner = owner_of(business)
    response = owner.call("POST", f"/businesses/{business.slug}/reviews", {"rating": 5})
    assert response.status_code == 403
    assert response.json()["code"] == "own_business"
    assert not Review.objects.filter(business=business).exists()


def test_owner_stats() -> None:
    business = published()
    owner = owner_of(business)
    response = owner.call("GET", f"/cabinet/businesses/{business.id}/stats?days=7")
    assert response.status_code == 200
    assert response.json()["days"] == 7
    assert owner.call("GET", f"/cabinet/businesses/{business.id}/stats?days=5").status_code == 400


def test_cleanup_removes_stale_uploads_and_expired_invites(media_root: Path) -> None:
    business = published()
    owner = owner_of(business)
    upload_id = owner.upload(business).json()["id"]
    upload = ChangeUpload.objects.get(pk=upload_id)
    ChangeUpload.objects.filter(pk=upload_id).update(
        created_at=timezone.now() - timedelta(hours=25)
    )
    OwnerInvite.objects.create(business=business, token_hash="0" * 64, expires_at=timezone.now())
    with patch("django.db.transaction.on_commit", side_effect=lambda f: f()):
        call_command("cleanup", stdout=io.StringIO())
    assert not ChangeUpload.objects.filter(pk=upload_id).exists()
    assert not (media_root / str(upload.file.name)).exists()
    assert not OwnerInvite.objects.exists()
