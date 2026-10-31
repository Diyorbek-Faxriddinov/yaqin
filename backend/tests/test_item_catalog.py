"""Do'kon katalogi (4.7, ADR-0014): turlangan xususiyatlar, mahsulot rasmlari, mahsulot bo'yicha
qidiruv. Har bir javob kontraktga qarshi tekshiriladi.
"""

import io
from collections.abc import Iterator
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from PIL import Image

from apps.businesses.models import Business, Item, ItemPhoto
from apps.catalog.models import Category
from apps.staff.models import AuditEntry
from tests.admin_api import AdminClient, admin_with
from tests.contract import assert_matches_contract
from tests.factories import make_admin, make_business, make_item, publishable

pytestmark = pytest.mark.django_db

SIZE: dict[str, Any] = {
    "key": "size",
    "name": {"uz": "Oʻlcham", "ru": "Размер"},
    "type": "multiselect",
    "unit": None,
    "options": [
        {"value": v, "label": {"uz": v.upper(), "ru": v.upper()}} for v in ("s", "m", "l", "xl")
    ],
    "filterable": True,
}
CONDITION: dict[str, Any] = {
    "key": "condition",
    "name": {"uz": "Holati", "ru": "Состояние"},
    "type": "select",
    "unit": None,
    "options": [
        {"value": "new", "label": {"uz": "Yangi", "ru": "Новый"}},
        {"value": "used", "label": {"uz": "Ishlatilgan", "ru": "Б/у"}},
    ],
    "filterable": True,
}
WARRANTY: dict[str, Any] = {
    "key": "warranty",
    "name": {"uz": "Kafolat", "ru": "Гарантия"},
    "type": "number",
    "unit": "oy",
    "options": [],
    "filterable": False,
}
HALAL: dict[str, Any] = {
    "key": "halal",
    "name": {"uz": "Halol", "ru": "Халяль"},
    "type": "boolean",
    "unit": None,
    "options": [],
    "filterable": True,
}
MATERIAL: dict[str, Any] = {
    "key": "material",
    "name": {"uz": "Mato", "ru": "Материал"},
    "type": "text",
    "unit": None,
    "options": [],
    "filterable": False,
}

ITEM: dict[str, Any] = {
    "kind": "product",
    "name": "Erkaklar futbolkasi",
    "group": "Erkaklar",
    "description": "100% paxta, Oʻzbekistonda tikilgan.",
    "price": {"type": "fixed", "min": {"amount": 12_000_000, "currency": "UZS"}, "max": None},
    "durationMinutes": None,
    "attributes": [],
    "isAvailable": True,
}


@pytest.fixture(autouse=True)
def media_root(settings: Any, tmp_path: Path) -> Path:
    settings.MEDIA_ROOT = tmp_path
    return tmp_path


@pytest.fixture(autouse=True)
def revalidated() -> Iterator[MagicMock]:
    with patch("apps.businesses.admin_views.revalidate") as mock:
        yield mock


@pytest.fixture
def root(client: Client) -> AdminClient:
    return AdminClient(client, make_admin(is_root=True))


@pytest.fixture
def shop() -> Business:
    category = Category.objects.get(slug="kiyim-kechak")
    category.attributes = [SIZE, CONDITION, WARRANTY, HALAL, MATERIAL]
    category.save(update_fields=["attributes"])
    return make_business(**publishable(name="Moda uyi", slug="moda-uyi", category=category))


def public_get(client: Client, path: str) -> Any:
    response = client.get(f"/api/v1{path}")
    assert_matches_contract(response)
    return response


def jpeg(width: int = 900, height: int = 1200) -> SimpleUploadedFile:
    buffer = io.BytesIO()
    Image.new("RGB", (width, height), (20, 90, 160)).save(buffer, format="JPEG")
    return SimpleUploadedFile("rasm.jpg", buffer.getvalue(), content_type="image/jpeg")


# --- Turlangan xususiyatlar ---


def test_typed_attributes_are_localized(root: AdminClient, client: Client, shop: Business) -> None:
    attributes = [
        {"key": "size", "name": "", "value": "l,s,m"},
        {"key": "condition", "name": "", "value": "new"},
        {"key": "warranty", "name": "", "value": "1,5"},
        {"key": "halal", "name": "", "value": "true"},
        {"key": "material", "name": "", "value": "Paxta"},
        {"key": None, "name": "Rang", "value": "Qora, oq"},
        # Tanlanmagan kategoriya xususiyati — tashlanadi
        {"key": "size", "name": "", "value": ""},
    ]
    response = root.call(
        "POST", f"/admin/businesses/{shop.id}/items", {**ITEM, "attributes": attributes[:-1]}
    )
    assert response.status_code == 201
    created = response.json()
    assert created["description"] == ITEM["description"]
    # Variantlar ta'rifdagi tartibda; son — vergul bilan
    assert created["attributes"] == [
        {"key": "size", "name": "Oʻlcham", "value": "S, M, L"},
        {"key": "condition", "name": "Holati", "value": "Yangi"},
        {"key": "warranty", "name": "Kafolat", "value": "1,5 oy"},
        {"key": "halal", "name": "Halol", "value": "Ha"},
        {"key": "material", "name": "Mato", "value": "Paxta"},
        {"key": "rang", "name": "Rang", "value": "Qora, oq"},
    ]
    assert created["attributeValues"] == [
        {"key": "size", "name": "Oʻlcham", "value": "s,m,l"},
        {"key": "condition", "name": "Holati", "value": "new"},
        {"key": "warranty", "name": "Kafolat", "value": "1.5"},
        {"key": "halal", "name": "Halol", "value": "true"},
        {"key": "material", "name": "Mato", "value": "Paxta"},
        {"key": None, "name": "Rang", "value": "Qora, oq"},
    ]

    ru = public_get(client, f"/businesses/moda-uyi/items/{created['slug']}?lang=ru").json()
    assert [(a["name"], a["value"]) for a in ru["attributes"]] == [
        ("Размер", "S, M, L"),
        ("Состояние", "Новый"),
        ("Гарантия", "1,5 oy"),
        ("Халяль", "Да"),
        ("Материал", "Paxta"),
        ("Rang", "Qora, oq"),
    ]


@pytest.mark.parametrize(
    ("attribute", "message"),
    [
        ({"key": "rangi", "name": "", "value": "qora"}, "Kategoriyada bunday xususiyat yoʻq"),
        ({"key": "size", "name": "", "value": "s,xxl"}, "Oʻlcham: qiymat notoʻgʻri"),
        ({"key": "condition", "name": "", "value": "s"}, "Holati: qiymat notoʻgʻri"),
        ({"key": "warranty", "name": "", "value": "bir yil"}, "Kafolat: qiymat notoʻgʻri"),
        ({"key": "halal", "name": "", "value": "ha"}, "Halol: qiymat notoʻgʻri"),
    ],
)
def test_typed_attribute_validation(
    root: AdminClient, shop: Business, attribute: dict[str, Any], message: str
) -> None:
    response = root.call(
        "POST", f"/admin/businesses/{shop.id}/items", {**ITEM, "attributes": [attribute]}
    )
    assert response.status_code == 400
    assert response.json()["fields"]["attributes"] == [message]


def test_duplicate_typed_attribute(root: AdminClient, shop: Business) -> None:
    twice = [{"key": "condition", "name": "", "value": "new"}] * 2
    response = root.call(
        "POST", f"/admin/businesses/{shop.id}/items", {**ITEM, "attributes": twice}
    )
    assert response.json()["fields"]["attributes"] == ["Holati: takrorlangan"]


def test_description_limit(root: AdminClient, shop: Business) -> None:
    response = root.call(
        "POST", f"/admin/businesses/{shop.id}/items", {**ITEM, "description": "a" * 1001}
    )
    assert response.json()["fields"]["description"] == ["1000 belgigacha"]


def test_removed_definition_falls_back_to_saved_text(
    root: AdminClient, client: Client, shop: Business
) -> None:
    attributes = [{"key": "size", "name": "", "value": "m,xl"}]
    created = root.call(
        "POST", f"/admin/businesses/{shop.id}/items", {**ITEM, "attributes": attributes}
    ).json()
    # Admin "XL" variantini olib tashladi — saqlangan qiymat endi ta'rifga mos emas
    category = shop.category
    category.attributes = [{**SIZE, "options": SIZE["options"][:3]}]
    category.save(update_fields=["attributes"])

    ru = public_get(client, f"/businesses/moda-uyi/items/{created['slug']}?lang=ru").json()
    assert ru["attributes"] == [{"key": "size", "name": "Oʻlcham", "value": "M, XL"}]
    listed = root.call("GET", f"/admin/businesses/{shop.id}/items").json()
    # Formada erkin xususiyat sifatida — qayta saqlansa ham buzilmaydi
    assert listed[0]["attributeValues"] == [{"key": None, "name": "Oʻlcham", "value": "M, XL"}]


# --- Mahsulot rasmlari ---


def test_item_photos(
    root: AdminClient,
    client: Client,
    shop: Business,
    media_root: Path,
    django_capture_on_commit_callbacks: Any,
) -> None:
    item = make_item(business=shop, kind=Item.Kind.PRODUCT, name="Futbolka", slug="futbolka")
    url = f"/admin/businesses/{shop.id}/items/{item.id}/photos"
    first = root.upload(url, {"file": jpeg(), "alt": "Futbolka, oldi"})
    assert first.status_code == 201
    assert first.json()["width"] == 900
    ids = [first.json()["id"]] + [root.upload(url, {"file": jpeg()}).json()["id"] for _ in range(4)]
    assert (media_root / "businesses" / str(shop.id) / "items" / str(item.id)).is_dir()

    limit = root.upload(url, {"file": jpeg()})
    assert limit.status_code == 400
    assert limit.json()["fields"]["file"] == ["Koʻpi bilan 5 ta rasm"]

    order = [ids[4], *ids[:4]]
    assert root.call("PUT", f"{url}/order", {"photoIds": order}).status_code == 204
    assert root.call("PUT", f"{url}/order", {"photoIds": ids[:2]}).status_code == 400
    public = public_get(client, "/businesses/moda-uyi/items/futbolka").json()
    assert [image["url"].rsplit("/", 1)[1] for image in public["images"]] == [
        f"{i}.webp" for i in order
    ]
    admin_listed = root.call("GET", f"/admin/businesses/{shop.id}/items").json()[0]
    assert [photo["id"] for photo in admin_listed["photos"]] == order

    with django_capture_on_commit_callbacks(execute=True):
        assert root.call("DELETE", f"{url}/{ids[0]}").status_code == 204
    assert not (
        media_root / "businesses" / str(shop.id) / "items" / str(item.id) / f"{ids[0]}.webp"
    ).exists()
    assert root.call("DELETE", f"{url}/{ids[0]}").status_code == 404

    # Mahsulot o'chirilsa — rasm fayllari ham
    with django_capture_on_commit_callbacks(execute=True):
        assert (
            root.call("DELETE", f"/admin/businesses/{shop.id}/items/{item.id}").status_code == 204
        )
    assert ItemPhoto.objects.count() == 0
    assert not list((media_root / "businesses" / str(shop.id) / "items").rglob("*.webp"))
    assert {"item.photo.upload", "item.photo.reorder", "item.photo.delete"} <= set(
        AuditEntry.objects.values_list("action", flat=True)
    )


def test_item_photo_of_other_business(root: AdminClient, shop: Business) -> None:
    item = make_item(business=shop)
    other = make_business()
    response = root.upload(f"/admin/businesses/{other.id}/items/{item.id}/photos", {"file": jpeg()})
    assert response.status_code == 404


def test_item_photo_needs_edit_permission(client: Client, shop: Business) -> None:
    item = make_item(business=shop)
    viewer = admin_with(client, extra=("business.view",))
    response = viewer.upload(
        f"/admin/businesses/{shop.id}/items/{item.id}/photos", {"file": jpeg()}
    )
    assert response.status_code == 403


def test_deleting_draft_removes_item_photos(
    root: AdminClient, media_root: Path, django_capture_on_commit_callbacks: Any
) -> None:
    draft = make_business()
    item = make_item(business=draft)
    root.upload(f"/admin/businesses/{draft.id}/items/{item.id}/photos", {"file": jpeg()})
    with django_capture_on_commit_callbacks(execute=True):
        assert root.call("DELETE", f"/admin/businesses/{draft.id}").status_code == 204
    assert not list(media_root.rglob("*.webp"))


# --- Mahsulot bo'yicha qidiruv ---


def test_search_finds_business_by_item_name(
    root: AdminClient, client: Client, shop: Business
) -> None:
    make_business(**publishable(name="Boshqa doʻkon", slug="boshqa"))
    created = root.call(
        "POST", f"/admin/businesses/{shop.id}/items", {**ITEM, "name": "Nike krossovkasi"}
    ).json()

    page = public_get(client, "/businesses?q=krossovka").json()
    assert [b["slug"] for b in page["items"]] == ["moda-uyi"]
    assert page["items"][0]["matchedItems"] == [
        {"slug": created["slug"], "name": "Nike krossovkasi"}
    ]
    # Kirill yozuvida ham; biznes nomi bo'yicha topilganda matchedItems bo'sh
    cyrillic = public_get(client, "/businesses?q=кроссовка").json()["items"]
    assert [b["slug"] for b in cyrillic] == ["moda-uyi"]
    assert public_get(client, "/businesses?q=moda").json()["items"][0]["matchedItems"] == []
    assert public_get(client, "/businesses").json()["items"][0]["matchedItems"] == []

    # Nom o'zgarsa yoki mahsulot o'chirilsa — eski nom bo'yicha topilmaydi
    url = f"/admin/businesses/{shop.id}/items/{created['id']}"
    root.call("PUT", url, {**ITEM, "name": "Adidas shippagi"})
    assert public_get(client, "/businesses?q=krossovka").json()["total"] == 0
    assert public_get(client, "/businesses?q=shippak").json()["total"] == 1
    root.call("DELETE", url)
    assert public_get(client, "/businesses?q=shippak").json()["total"] == 0


def test_group_name_is_searchable(root: AdminClient, client: Client, shop: Business) -> None:
    root.call("POST", f"/admin/businesses/{shop.id}/items", {**ITEM, "group": "Oyoq kiyim"})
    assert public_get(client, "/businesses?q=oyoq+kiyim").json()["total"] == 1


def test_suggest_returns_items_of_published_businesses(
    root: AdminClient, client: Client, shop: Business
) -> None:
    root.call("POST", f"/admin/businesses/{shop.id}/items", {**ITEM, "name": "Qishki kurtka"})
    hidden = make_business(**publishable(status=Business.Status.HIDDEN))
    make_item(business=hidden, name="Kurtka (yashirin)", slug="kurtka")

    suggestions = public_get(client, "/search/suggest?q=kurtka").json()
    assert suggestions["items"] == [
        {
            "slug": "qishki-kurtka",
            "name": "Qishki kurtka",
            "businessSlug": "moda-uyi",
            "businessName": "Moda uyi",
        }
    ]
