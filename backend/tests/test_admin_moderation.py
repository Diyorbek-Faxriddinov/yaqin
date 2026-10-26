"""Admin API: sharhlar, shikoyatlar, biznes so'rovlari, foydalanuvchilarni bloklash."""

from collections.abc import Iterator
from datetime import timedelta
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from django.test import Client
from django.utils import timezone

from apps.accounts.models import CustomerSession, User
from apps.accounts.sessions import create_session
from apps.businesses.models import Business, BusinessRequest
from apps.catalog.models import District
from apps.community.models import Complaint, Review
from apps.staff.models import AuditEntry
from tests.admin_api import AdminClient, admin_with
from tests.contract import assert_matches_contract
from tests.factories import make_admin, make_business, make_user, publishable

pytestmark = pytest.mark.django_db


@pytest.fixture
def root(client: Client) -> AdminClient:
    return AdminClient(client, make_admin(is_root=True))


@pytest.fixture
def business() -> Business:
    return make_business(**publishable(name="Ustoz", slug="ustoz"))


@pytest.fixture
def revalidated() -> Iterator[MagicMock]:
    with patch("apps.community.services.revalidate") as mock:
        yield mock


def review(business: Business, *, rating: int = 4, age_days: int = 0, **fields: Any) -> Review:
    entry = Review.objects.create(business=business, user=make_user(), rating=rating, **fields)
    Review.objects.filter(pk=entry.pk).update(created_at=timezone.now() - timedelta(days=age_days))
    return entry


def complaint(business: Business, *, age_days: int = 0, **fields: Any) -> Complaint:
    entry = Complaint.objects.create(
        business=business, user=make_user(), reason=Complaint.Reason.WRONG_INFO, **fields
    )
    Complaint.objects.filter(pk=entry.pk).update(
        created_at=timezone.now() - timedelta(days=age_days)
    )
    return entry


def request_entry(**fields: Any) -> BusinessRequest:
    return BusinessRequest.objects.create(
        **{
            "business_name": "Gulnora gullari",
            "contact_name": "Gulnora",
            "phone": "+998901112233",
            "address": "Chilonzor 5",
            "district": District.objects.get(slug="chilonzor"),
            **fields,
        }
    )


def ids(response: Any) -> list[str]:
    return [item["id"] for item in response.json()["items"]]


# --- Ruxsatlar ---


def test_permissions(client: Client, business: Business) -> None:
    analyst = admin_with(client, roles=("Tahlilchi",))
    for path in ("/admin/reviews", "/admin/complaints", "/admin/users", "/admin/business-requests"):
        assert analyst.call("GET", path).status_code == 403
    moderator = admin_with(client, roles=("Moderator",))
    for path in ("/admin/reviews", "/admin/complaints", "/admin/users"):
        assert moderator.call("GET", path).status_code == 200
    # Telefon raqamlari bor — faqat business.edit
    assert moderator.call("GET", "/admin/business-requests").status_code == 403
    # Bloklash — user.manage (moderatorda faqat user.view)
    user = make_user()
    body = {"isBlocked": True, "blockedReason": "Spam"}
    assert moderator.call("PATCH", f"/admin/users/{user.id}", body).status_code == 403


# --- Sharhlar ---


def test_review_queue_order(root: AdminClient, business: Business) -> None:
    old = review(business, age_days=3)
    new = review(business, age_days=1)
    published = review(business, status=Review.Status.PUBLISHED)
    assert ids(root.call("GET", "/admin/reviews?status=pending")) == [str(old.id), str(new.id)]
    # Umumiy ro'yxat — eng yangisi birinchi
    assert ids(root.call("GET", "/admin/reviews"))[0] == str(published.id)
    assert root.call("GET", "/admin/reviews?status=boshqa").status_code == 400


def test_publish_and_reject_update_rating(
    root: AdminClient, business: Business, revalidated: MagicMock
) -> None:
    entry = review(business, rating=4)
    url = f"/admin/reviews/{entry.id}"
    body = root.call("PATCH", url, {"status": "published"}).json()
    assert body["status"] == "published"
    assert body["moderatedAt"] is not None
    business.refresh_from_db()
    assert (business.rating_count, business.rating_sum) == (1, 4)
    revalidated.assert_called_with("businesses", "business:ustoz", "reviews:ustoz")

    # Takror chop etish reytingni ikki marta qo'shmaydi
    root.call("PATCH", url, {"status": "published"})
    business.refresh_from_db()
    assert business.rating_count == 1

    response = root.call("PATCH", url, {"status": "rejected", "rejectionReason": "Spam"})
    assert response.json()["rejectionReason"] == "Spam"
    business.refresh_from_db()
    assert (business.rating_count, business.rating_sum) == (0, 0)
    actions = list(AuditEntry.objects.values_list("action", flat=True))
    assert actions.count("review.publish") == 2
    assert "review.reject" in actions


def test_reject_requires_reason(root: AdminClient, business: Business) -> None:
    entry = review(business)
    url = f"/admin/reviews/{entry.id}"
    response = root.call("PATCH", url, {"status": "rejected", "rejectionReason": "x"})
    assert response.status_code == 400
    assert root.call("PATCH", url, {"status": "pending"}).status_code == 400
    missing = "00000000-0000-4000-a000-000000000000"
    assert (
        root.call("PATCH", f"/admin/reviews/{missing}", {"status": "published"}).status_code == 404
    )


def test_review_of_deleted_user(root: AdminClient, business: Business) -> None:
    entry = review(business, status=Review.Status.PUBLISHED)
    User.objects.filter(reviews=entry).delete()
    item = root.call("GET", "/admin/reviews").json()["items"][0]
    assert item["author"] is None


# --- Shikoyatlar ---


def test_complaints(root: AdminClient, business: Business) -> None:
    old, new = complaint(business, age_days=2), complaint(business)
    assert ids(root.call("GET", "/admin/complaints?status=open")) == [str(old.id), str(new.id)]
    url = f"/admin/complaints/{old.id}"
    assert root.call("PATCH", url, {"status": "in_review"}).json()["status"] == "in_review"
    response = root.call("PATCH", url, {"status": "resolved"})
    assert response.status_code == 400
    assert "resolutionNote" in response.json()["fields"]
    body = root.call(
        "PATCH", url, {"status": "resolved", "resolutionNote": "Manzil tuzatildi"}
    ).json()
    assert body["resolutionNote"] == "Manzil tuzatildi"
    assert ids(root.call("GET", "/admin/complaints?status=resolved")) == [str(old.id)]
    assert AuditEntry.objects.filter(action="complaint.resolved").exists()


# --- Biznes so'rovlari ---


def test_requests_status_and_note(root: AdminClient) -> None:
    entry = request_entry()
    url = f"/admin/business-requests/{entry.id}"
    listed = root.call("GET", "/admin/business-requests?status=new").json()["items"]
    assert listed[0]["phone"] == "+998901112233"
    assert (
        root.call("PATCH", url, {"status": "contacted", "adminNote": "Ertaga boramiz"}).status_code
        == 200
    )
    response = root.call("PATCH", url, {"status": "rejected", "adminNote": ""})
    assert response.status_code == 400
    body = root.call("PATCH", url, {"status": "rejected", "adminNote": "Toshkentda emas"}).json()
    assert body["status"] == "rejected"
    entry.refresh_from_db()
    assert entry.closed_at is not None
    # Qayta ochilsa — o'chirish muddati hisobi to'xtaydi
    root.call("PATCH", url, {"status": "new"})
    entry.refresh_from_db()
    assert entry.closed_at is None
    assert root.call("PATCH", url, {"status": "converted"}).status_code == 400


def test_convert_request(root: AdminClient, client: Client) -> None:
    entry = request_entry()
    url = f"/admin/business-requests/{entry.id}/convert"
    body = {
        "name": "Gulnora gullari",
        "categorySlug": "sartaroshxonalar",
        "districtSlug": "chilonzor",
    }
    response = root.call("POST", url, body)
    assert response.status_code == 201
    created = response.json()
    assert created["status"] == "draft"
    assert created["address"]["text"] == "Chilonzor 5"
    assert created["phones"] == [{"number": "+998901112233", "label": None}]
    entry.refresh_from_db()
    assert entry.status == "converted"
    assert str(entry.business_id) == created["id"]
    assert root.call("POST", url, body).status_code == 409
    patch_url = f"/admin/business-requests/{entry.id}"
    assert root.call("PATCH", patch_url, {"status": "new"}).status_code == 409
    actions = set(AuditEntry.objects.values_list("action", flat=True))
    assert {"request.convert", "business.create"} <= actions


# --- Foydalanuvchilar ---


def test_users_list(root: AdminClient, business: Business) -> None:
    aziz = make_user(display_name="Aziz Karimov")
    make_user(display_name="Malika", is_blocked=True, blocked_reason="Spam")
    Review.objects.create(business=business, user=aziz, rating=5)
    rows = root.call("GET", "/admin/users?q=aziz").json()["items"]
    assert [(r["displayName"], r["reviewsCount"]) for r in rows] == [("Aziz Karimov", 1)]
    blocked = root.call("GET", "/admin/users?blocked=true").json()["items"]
    assert [r["displayName"] for r in blocked] == ["Malika"]
    # Kontakt maʼlumotlari qaytarilmaydi (kontrakt sxemasi ham tekshiradi)
    assert set(rows[0]) == {
        "id",
        "displayName",
        "provider",
        "createdAt",
        "isBlocked",
        "blockedReason",
        "reviewsCount",
        "complaintsCount",
    }


def test_block_ends_sessions(root: AdminClient, client: Client) -> None:
    user = make_user()
    create_session(user)
    url = f"/admin/users/{user.id}"
    assert root.call("PATCH", url, {"isBlocked": True}).status_code == 400
    body = root.call(
        "PATCH", url, {"isBlocked": True, "blockedReason": "Haqoratli sharhlar"}
    ).json()
    assert body["isBlocked"] is True
    assert not CustomerSession.objects.filter(user=user).exists()
    other = Client()
    token, _ = create_session(user)
    other.cookies["sessionid"] = token
    response = other.get("/api/v1/me")
    assert_matches_contract(response)
    assert response.status_code == 401

    body = root.call("PATCH", url, {"isBlocked": False}).json()
    assert (body["isBlocked"], body["blockedReason"]) == (False, None)
    assert {"user.block", "user.unblock"} <= set(
        AuditEntry.objects.values_list("action", flat=True)
    )
