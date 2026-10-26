"""Admin API: bizneslar, rasmlar, katalog. Har bir javob kontraktga qarshi tekshiriladi."""

import io
from collections.abc import Iterator
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from PIL import Image

from apps.businesses.models import Business, BusinessPhoto, Item
from apps.businesses.slugs import slugify
from apps.staff.models import AuditEntry
from tests.admin_api import AdminClient, admin_with
from tests.contract import assert_matches_contract
from tests.factories import make_admin, make_business, make_item, publishable

pytestmark = pytest.mark.django_db

CONSENT = {"givenBy": "Aziz aka (egasi)", "givenAt": "2026-10-20T10:00:00+05:00", "note": None}


@pytest.fixture(autouse=True)
def media_root(settings: Any, tmp_path: Path) -> Path:
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture
def revalidated() -> Iterator[MagicMock]:
    with patch("apps.businesses.admin_views.revalidate") as mock:
        yield mock


@pytest.fixture
def root(client: Client) -> AdminClient:
    return AdminClient(client, make_admin(is_root=True))


def public_get(client: Client, path: str) -> Any:
    response = client.get(f"/api/v1{path}")
    assert_matches_contract(response)
    return response


def jpeg(width: int = 800, height: int = 400, **save: Any) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (200, 30, 30)).save(buffer, format="JPEG", **save)
    return buffer.getvalue()


def upload_file(content: bytes, name: str = "rasm.jpg", kind: str = "image/jpeg") -> Any:
    return SimpleUploadedFile(name, content, content_type=kind)


# --- Ruxsatlar ---


def test_requires_admin_session(client: Client) -> None:
    response = client.get("/api/v1/admin/businesses")
    assert_matches_contract(response)
    assert response.status_code == 401


def test_permissions_by_role(client: Client) -> None:
    business = make_business()
    nobody = admin_with(client)
    assert nobody.call("GET", "/admin/businesses").status_code == 403

    analyst = admin_with(client, roles=("Tahlilchi",))
    assert analyst.call("GET", "/admin/businesses").status_code == 200
    assert analyst.call("GET", f"/admin/businesses/{business.id}").status_code == 200
    body = {"name": "Yangi", "categorySlug": "sartaroshxonalar", "districtSlug": "chilonzor"}
    assert analyst.call("POST", "/admin/businesses", body).status_code == 403
    assert (
        analyst.call("PATCH", f"/admin/businesses/{business.id}", {"name": "X1"}).status_code == 403
    )
    assert analyst.call("POST", f"/admin/businesses/{business.id}/items", {}).status_code == 403

    editor = admin_with(client, roles=("Kontent menejeri",))
    assert editor.call("POST", "/admin/businesses", body).status_code == 201


def test_status_change_needs_publish_permission(client: Client, revalidated: MagicMock) -> None:
    business = make_business(**publishable(status=Business.Status.DRAFT))
    url = f"/admin/businesses/{business.id}"
    edit_only = admin_with(client, extra=("business.view", "business.edit"))
    assert edit_only.call("PATCH", url, {"name": "Yangi nom"}).status_code == 200
    assert edit_only.call("PATCH", url, {"status": "published"}).status_code == 403

    publish_only = admin_with(client, extra=("business.view", "business.publish"))
    assert publish_only.call("PATCH", url, {"status": "published"}).status_code == 200
    # Boshqa maydon bilan birga — business.edit ham kerak
    response = publish_only.call("PATCH", url, {"status": "hidden", "name": "Boshqa"})
    assert response.status_code == 403


def test_csrf_required(client: Client) -> None:
    admin = AdminClient(client, make_admin(is_root=True))
    admin.csrf = "notogri"
    body = {"name": "Yangi", "categorySlug": "sartaroshxonalar", "districtSlug": "chilonzor"}
    assert admin.call("POST", "/admin/businesses", body).status_code == 403


# --- Ro'yxat ---


def test_list_filters_and_counts(root: AdminClient) -> None:
    draft = make_business(name="Qoralama sartarosh")
    published = make_business(**publishable(name="Ustoz", slug="ustoz"))
    make_item(business=published)
    BusinessPhoto.objects.create(business=published, file="x.webp", width=10, height=10)
    hidden = make_business(**publishable(name="Yashirin", status=Business.Status.HIDDEN))

    body = root.call("GET", "/admin/businesses").json()
    assert body["total"] == 3
    # Oxirgi o'zgargani birinchi
    assert [i["id"] for i in body["items"]] == [str(hidden.id), str(published.id), str(draft.id)]
    row = next(i for i in body["items"] if i["id"] == str(published.id))
    assert (row["photosCount"], row["itemsCount"], row["hasConsent"]) == (1, 1, True)

    def ids(query: str) -> set[str]:
        return {i["id"] for i in root.call("GET", f"/admin/businesses?{query}").json()["items"]}

    assert ids("status=draft") == {str(draft.id)}
    assert ids("missingConsent=true") == {str(draft.id)}
    assert ids("q=ustoz") == {str(published.id)}
    page = root.call("GET", "/admin/businesses?pageSize=2&page=2").json()
    assert (page["total"], len(page["items"])) == (3, 1)
    assert root.call("GET", "/admin/businesses?status=boshqa").status_code == 400


# --- Yaratish va tahrirlash ---


def test_create_draft(root: AdminClient, client: Client) -> None:
    make_business(name="Ustoz", slug="ustoz")
    body = {"name": "  Ustoz ", "categorySlug": "sartaroshxonalar", "districtSlug": "yunusobod"}
    response = root.call("POST", "/admin/businesses?lang=ru", body)
    assert response.status_code == 201
    created = response.json()
    assert created["slug"] == "ustoz-2"
    assert created["status"] == "draft"
    assert created["district"]["slug"] == "yunusobod"
    assert created["consent"] is None
    assert created["location"] is None
    assert AuditEntry.objects.filter(action="business.create", target_id=created["id"]).exists()
    # Qoralama saytda ko'rinmaydi
    assert public_get(client, "/businesses/ustoz-2").status_code == 404


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"name": "U", "categorySlug": "sartaroshxonalar", "districtSlug": "chilonzor"}, "name"),
        # Ota-kategoriyaga biriktirib bo'lmaydi
        (
            {"name": "Ustoz", "categorySlug": "goʻzallik", "districtSlug": "chilonzor"},
            "categorySlug",
        ),
        (
            {"name": "Ustoz", "categorySlug": "sartaroshxonalar", "districtSlug": "yoq"},
            "districtSlug",
        ),
    ],
)
def test_create_validation(root: AdminClient, body: dict[str, str], field: str) -> None:
    response = root.call("POST", "/admin/businesses", body)
    assert response.status_code == 400
    assert field in response.json()["fields"]


def test_slugify() -> None:
    assert slugify("Choyxona «Oqtepa»") == "choyxona-oqtepa"
    assert slugify("Gʻuncha boʻyoqlari") == "guncha-boyoqlari"
    assert slugify("Цветочный рай") == "tsvetochniy-ray"
    assert slugify("!!!") == "biznes"


def test_update_fields(root: AdminClient, revalidated: MagicMock) -> None:
    business = make_business()
    schedule = {
        "is24x7": False,
        "days": [{"weekday": 1, "intervals": [{"open": "09:00", "close": "18:00"}]}],
    }
    response = root.call(
        "PATCH",
        f"/admin/businesses/{business.id}",
        {
            "description": "  Erkaklar sartaroshxonasi  ",
            "address": {"text": "Bunyodkor 1", "landmark": None},
            "location": {"lat": 41.2755, "lng": 69.2042},
            "phones": [{"number": "+998901234567", "label": "Admin"}],
            "telegram": "@ustoz_barber",
            "instagram": None,
            "schedule": schedule,
            "consent": CONSENT,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["description"] == "Erkaklar sartaroshxonasi"
    assert body["location"] == {"lat": 41.2755, "lng": 69.2042}
    assert body["telegram"] == "ustoz_barber"
    assert body["schedule"] == schedule
    assert body["consent"]["givenBy"] == CONSENT["givenBy"]
    assert body["status"] == "draft"
    entry = AuditEntry.objects.get(action="business.update")
    assert "phones" in entry.summary
    revalidated.assert_called()


@pytest.mark.parametrize(
    ("body", "field"),
    [
        ({"phones": [{"number": "901234567"}]}, "phones"),
        ({"phones": [{"number": "+998901234567"}] * 6}, "phones"),
        ({"telegram": "ab"}, "telegram"),
        ({"location": {"lat": 120, "lng": 69}}, "location"),
        ({"schedule": {"is24x7": False, "days": [{"weekday": 9, "intervals": []}]}}, "schedule"),
        ({"consent": {"givenBy": "Aziz", "givenAt": "kecha", "note": None}}, "consent"),
        ({"categorySlug": "goʻzallik"}, "categorySlug"),
    ],
)
def test_update_validation(root: AdminClient, body: dict[str, Any], field: str) -> None:
    business = make_business()
    response = root.call("PATCH", f"/admin/businesses/{business.id}", body)
    assert response.status_code == 400
    assert field in response.json()["fields"]
    business.refresh_from_db()
    assert business.phones == []


def test_publish_requires_location_address_consent(
    root: AdminClient, revalidated: MagicMock, client: Client
) -> None:
    business = make_business(name="Ustoz", slug="ustoz")
    url = f"/admin/businesses/{business.id}"
    response = root.call("PATCH", url, {"status": "published"})
    assert response.status_code == 400
    assert set(response.json()["fields"]) == {"location", "address", "consent"}

    response = root.call(
        "PATCH",
        url,
        {
            "status": "published",
            "location": {"lat": 41.2755, "lng": 69.2042},
            "address": {"text": "Bunyodkor 1", "landmark": "Metro yonida"},
            "consent": CONSENT,
        },
    )
    assert response.status_code == 200
    business.refresh_from_db()
    assert business.published_at is not None
    assert AuditEntry.objects.filter(action="business.status.published").exists()
    revalidated.assert_called_with("businesses", "categories", "business:ustoz")
    assert public_get(client, "/businesses/ustoz").status_code == 200


def test_slug_follows_name_only_before_first_publish(
    root: AdminClient, revalidated: MagicMock
) -> None:
    business = make_business(
        **publishable(name="Eski nom", slug="eski-nom", status=Business.Status.DRAFT)
    )
    url = f"/admin/businesses/{business.id}"
    assert root.call("PATCH", url, {"name": "Yangi nom"}).json()["slug"] == "yangi-nom"
    root.call("PATCH", url, {"status": "published"})
    # E'lon qilingan sahifa manzili o'zgarmaydi; eski va yangi kesh yangilanadi
    assert root.call("PATCH", url, {"name": "Boshqa nom"}).json()["slug"] == "yangi-nom"
    root.call("PATCH", url, {"status": "hidden"})
    assert root.call("PATCH", url, {"name": "Uchinchi nom"}).json()["slug"] == "yangi-nom"


def test_unknown_business(root: AdminClient) -> None:
    missing = "00000000-0000-4000-a000-000000000000"
    assert root.call("GET", f"/admin/businesses/{missing}").status_code == 404
    assert root.call("PATCH", f"/admin/businesses/{missing}", {"name": "Yangi"}).status_code == 404
    assert root.call("GET", f"/admin/businesses/{missing}/items").status_code == 404


# --- Rasmlar ---


def test_upload_reencodes_and_strips_metadata(
    root: AdminClient, media_root: Path, revalidated: MagicMock
) -> None:
    business = make_business()
    exif = Image.Exif()
    exif[0x010F] = "MaxfiyKamera"  # Make
    exif[0x0112] = 6  # Orientation: 90° burilgan
    exif.get_ifd(0x8825)[2] = (41.0, 16.0, 30.0)  # GPSLatitude
    response = root.upload(
        f"/admin/businesses/{business.id}/photos",
        {"file": upload_file(jpeg(3000, 1200, exif=exif)), "alt": "Old tomoni", "width": "1"},
    )
    assert response.status_code == 201
    photo = response.json()
    # Burilish qo'llandi, uzun tomoni 2000 px; klient yuborgan o'lchamga ishonilmaydi
    assert (photo["width"], photo["height"]) == (800, 2000)
    assert photo["alt"] == "Old tomoni"
    assert photo["url"].endswith(f"/media/businesses/{business.id}/{photo['id']}.webp")

    stored = media_root / "businesses" / str(business.id) / f"{photo['id']}.webp"
    content = stored.read_bytes()
    assert b"MaxfiyKamera" not in content
    with Image.open(stored) as image:
        assert image.format == "WEBP"
        assert not image.getexif()
    assert AuditEntry.objects.filter(action="photo.upload").exists()
    assert (
        root.call("GET", f"/admin/businesses/{business.id}").json()["photos"][0]["id"]
        == photo["id"]
    )


def test_upload_png_keeps_transparency(root: AdminClient, media_root: Path) -> None:
    buffer = io.BytesIO()
    Image.new("RGBA", (400, 400), (0, 0, 0, 0)).save(buffer, format="PNG")
    business = make_business()
    response = root.upload(
        f"/admin/businesses/{business.id}/photos",
        {"file": upload_file(buffer.getvalue(), "logo.png", "image/png")},
    )
    assert response.status_code == 201
    with Image.open(next(media_root.rglob("*.webp"))) as image:
        assert image.mode == "RGBA"


@pytest.mark.parametrize(
    ("content", "message"),
    [
        (b"bu rasm emas", "Faqat JPEG, PNG yoki WebP"),
        (b"GIF89a" + b"\x00" * 100, "Faqat JPEG, PNG yoki WebP"),
        (jpeg(150, 150), "Rasm juda kichik (kamida 200 px)"),
        (jpeg()[:200], "Rasm fayli buzilgan"),
    ],
)
def test_upload_rejects_bad_files(
    root: AdminClient, media_root: Path, content: bytes, message: str
) -> None:
    business = make_business()
    response = root.upload(
        f"/admin/businesses/{business.id}/photos", {"file": upload_file(content)}
    )
    assert response.status_code == 400
    assert response.json()["fields"]["file"] == [message]
    assert not BusinessPhoto.objects.exists()
    assert not list(media_root.rglob("*.webp"))


def test_upload_limits(root: AdminClient, media_root: Path) -> None:
    business = make_business()
    url = f"/admin/businesses/{business.id}/photos"
    big = upload_file(jpeg() + b"\x00" * (5 * 1024 * 1024))
    assert root.upload(url, {"file": big}).status_code == 413
    assert root.upload(url, {"alt": "faylsiz"}).status_code == 400
    for position in range(12):
        BusinessPhoto.objects.create(
            business=business, file=f"x{position}.webp", width=1, height=1, position=position
        )
    response = root.upload(url, {"file": upload_file(jpeg())})
    assert response.status_code == 400
    assert response.json()["fields"]["file"] == ["Koʻpi bilan 12 ta rasm"]
    assert not list(media_root.rglob("*.webp"))


def test_reorder_and_delete_photos(
    root: AdminClient,
    client: Client,
    media_root: Path,
    revalidated: MagicMock,
    django_capture_on_commit_callbacks: Any,
) -> None:
    business = make_business(**publishable(name="Ustoz", slug="ustoz"))
    url = f"/admin/businesses/{business.id}/photos"
    ids = [root.upload(url, {"file": upload_file(jpeg())}).json()["id"] for _ in range(3)]

    response = root.call("PUT", f"{url}/order", {"photoIds": [ids[2], ids[0], ids[1]]})
    assert response.status_code == 204
    gallery = public_get(client, "/businesses/ustoz").json()["gallery"]
    assert [g["url"].rsplit("/", 1)[1] for g in gallery] == [
        f"{i}.webp" for i in (ids[2], ids[0], ids[1])
    ]
    assert root.call("PUT", f"{url}/order", {"photoIds": ids[:2]}).status_code == 400
    assert root.call("PUT", f"{url}/order", {"photoIds": [*ids[:2], ids[0]]}).status_code == 400

    with django_capture_on_commit_callbacks(execute=True):
        assert root.call("DELETE", f"{url}/{ids[0]}").status_code == 204
    assert not (media_root / "businesses" / str(business.id) / f"{ids[0]}.webp").exists()
    assert BusinessPhoto.objects.filter(business=business).count() == 2
    # Rasm o'zgarishi kategoriyalar keshiga taalluqli emas
    revalidated.assert_called_with("businesses", "business:ustoz")
    # Boshqa biznesning rasmi — 404
    other = make_business()
    assert root.call("DELETE", f"/admin/businesses/{other.id}/photos/{ids[1]}").status_code == 404


# --- Katalog ---

PRODUCT = {
    "kind": "product",
    "name": "Soqol moyi",
    "group": "Mahsulotlar",
    "description": None,
    "price": {"type": "fixed", "min": {"amount": 8_000_000, "currency": "UZS"}, "max": None},
    "durationMinutes": 30,
    "attributes": [{"name": "Hajmi", "value": "50 ml"}, {"name": "", "value": "bo'sh"}],
    "isAvailable": False,
}


def test_item_crud(root: AdminClient, client: Client, revalidated: MagicMock) -> None:
    business = make_business(**publishable(name="Ustoz", slug="ustoz"))
    url = f"/admin/businesses/{business.id}/items"
    response = root.call("POST", url, PRODUCT)
    assert response.status_code == 201
    item = response.json()
    assert item["slug"] == "soqol-moyi"
    # Mahsulotda davomiylik bo'lmaydi; bo'sh atribut tashlanadi
    assert item["durationMinutes"] is None
    assert item["attributes"] == [{"key": "hajmi", "name": "Hajmi", "value": "50 ml"}]
    assert root.call("POST", url, PRODUCT).json()["slug"] == "soqol-moyi-2"

    service = {
        **PRODUCT,
        "kind": "service",
        "name": "Soch olish",
        "price": {
            "type": "range",
            "min": {"amount": 5_000_000, "currency": "UZS"},
            "max": {"amount": 8_000_000, "currency": "UZS"},
        },
        "isAvailable": True,
    }
    created = root.call("POST", url, service).json()
    assert created["durationMinutes"] == 30

    listed = root.call("GET", url).json()
    assert [i["slug"] for i in listed] == ["soqol-moyi", "soqol-moyi-2", "soch-olish"]

    updated = root.call(
        "PUT",
        f"{url}/{created['id']}",
        {
            **service,
            "name": "Soch olish (klassik)",
            "price": {"type": "on_request", "min": None, "max": None},
        },
    ).json()
    assert updated["slug"] == "soch-olish"
    response = root.call("PUT", f"{url}/{created['id']}", {**service, "name": "S"})
    assert response.status_code == 400
    assert updated["price"] == {"type": "on_request", "min": None, "max": None}

    assert root.call("DELETE", f"{url}/{listed[0]['id']}").status_code == 204
    assert root.call("DELETE", f"{url}/{listed[0]['id']}").status_code == 404
    other = make_business()
    assert (
        root.call("PUT", f"/admin/businesses/{other.id}/items/{created['id']}", service).status_code
        == 404
    )
    assert {e.action for e in AuditEntry.objects.all()} >= {
        "item.create",
        "item.update",
        "item.delete",
    }
    assert Item.objects.filter(business=business).count() == 2


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"name": "S"}, "name"),
        ({"kind": "boshqa"}, "kind"),
        ({"price": {"type": "fixed", "min": None, "max": None}}, "price"),
        (
            {"price": {"type": "fixed", "min": {"amount": 0, "currency": "UZS"}, "max": None}},
            "price",
        ),
        (
            {
                "price": {
                    "type": "range",
                    "min": {"amount": 500, "currency": "UZS"},
                    "max": {"amount": 400, "currency": "UZS"},
                }
            },
            "price",
        ),
        ({"kind": "service", "durationMinutes": 2}, "durationMinutes"),
        ({"attributes": [{"name": "a", "value": "b"}] * 21}, "attributes"),
    ],
)
def test_item_validation(root: AdminClient, change: dict[str, Any], field: str) -> None:
    business = make_business()
    response = root.call("POST", f"/admin/businesses/{business.id}/items", {**PRODUCT, **change})
    assert response.status_code == 400
    assert field in response.json()["fields"]
