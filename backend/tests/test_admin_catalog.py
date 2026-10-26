"""Admin API: kategoriyalar va atributlar. Har bir javob kontraktga qarshi tekshiriladi."""

from collections.abc import Iterator
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from django.test import Client

from apps.businesses.models import Business
from apps.catalog.models import Category
from apps.staff.models import AuditEntry
from tests.admin_api import AdminClient, admin_with
from tests.contract import assert_matches_contract
from tests.factories import make_admin, make_business

pytestmark = pytest.mark.django_db

ATTRIBUTE = {
    "key": "kafolat",
    "name": {"uz": "Kafolat", "ru": "Гарантия"},
    "type": "number",
    "unit": "oy",
    "options": [],
    "filterable": False,
}


@pytest.fixture
def root(client: Client) -> AdminClient:
    return AdminClient(client, make_admin(is_root=True))


@pytest.fixture
def revalidated() -> Iterator[MagicMock]:
    with patch("apps.catalog.admin_views.revalidate") as mock:
        yield mock


def category(slug: str) -> Category:
    return Category.objects.get(slug=slug)


def test_permission(client: Client) -> None:
    assert (
        admin_with(client, roles=("Moderator",)).call("GET", "/admin/categories").status_code == 403
    )
    editor = admin_with(client, roles=("Kontent menejeri",))
    assert editor.call("GET", "/admin/categories").status_code == 200


def test_list_is_tree_ordered_with_counts(root: AdminClient) -> None:
    make_business()  # sartaroshxonalar — qoralama ham hisoblanadi
    make_business(category=category("sartaroshxonalar"))
    rows = root.call("GET", "/admin/categories").json()
    assert len(rows) == Category.objects.count()
    by_slug = {r["slug"]: r for r in rows}
    barber = by_slug["sartaroshxonalar"]
    parent = next(r for r in rows if r["id"] == barber["parentId"])
    assert barber["businessCount"] == 2
    assert parent["businessCount"] >= 2
    # Ichki kategoriya ikonkani ota-kategoriyadan oladi; ota-kategoriya undan oldin keladi
    assert barber["iconKey"] == parent["iconKey"]
    assert rows.index(parent) < rows.index(barber)


def test_create_root_and_child(root: AdminClient, revalidated: MagicMock) -> None:
    response = root.call(
        "POST",
        "/admin/categories",
        {
            "slug": "test-yonalish",
            "name": {"uz": "Uy hayvonlari", "ru": "Питомцы"},
            "parentId": None,
            "iconKey": "pets",
        },
    )
    assert response.status_code == 201
    parent = response.json()
    assert parent["iconKey"] == "pets"
    child = root.call(
        "POST",
        "/admin/categories",
        {
            "slug": "test-ichki",
            "name": {"uz": "Veterinariya", "ru": "Ветклиники"},
            "parentId": parent["id"],
        },
    ).json()
    assert child["iconKey"] == "pets"
    assert child["parentId"] == parent["id"]
    revalidated.assert_called_with("categories", "category:test-yonalish")
    assert AuditEntry.objects.filter(action="category.create").count() == 2


@pytest.mark.parametrize(
    ("body", "field"),
    [
        (
            {
                "slug": "Katta Harf",
                "name": {"uz": "Nom", "ru": "Имя"},
                "parentId": None,
                "iconKey": "pets",
            },
            "slug",
        ),
        (
            {
                "slug": "yangi",
                "name": {"uz": "N", "ru": "Имя"},
                "parentId": None,
                "iconKey": "pets",
            },
            "name",
        ),
        ({"slug": "yangi", "name": {"uz": "Nom", "ru": "Имя"}, "parentId": None}, "iconKey"),
    ],
)
def test_create_validation(root: AdminClient, body: dict[str, Any], field: str) -> None:
    response = root.call("POST", "/admin/categories", body)
    assert response.status_code == 400
    assert field in response.json()["fields"]


def test_create_conflicts(root: AdminClient) -> None:
    body = {
        "slug": "sartaroshxonalar",
        "name": {"uz": "Nom", "ru": "Имя"},
        "parentId": None,
        "iconKey": "pets",
    }
    assert root.call("POST", "/admin/categories", body).status_code == 409
    # Ichki kategoriya ota-kategoriya bo'la olmaydi (ikki daraja)
    leaf = category("sartaroshxonalar")
    body = {"slug": "uchinchi", "name": {"uz": "Nom", "ru": "Имя"}, "parentId": str(leaf.id)}
    response = root.call("POST", "/admin/categories", body)
    assert response.status_code == 400
    assert "parentId" in response.json()["fields"]


def test_update_name_refreshes_search(
    root: AdminClient, revalidated: MagicMock, client: Client
) -> None:
    leaf = category("sartaroshxonalar")
    business = make_business(slug="ustoz", name="Ustoz")
    response = root.call(
        "PATCH",
        f"/admin/categories/{leaf.id}",
        {"name": {"uz": "Barbershoplar", "ru": "Барбершопы"}},
    )
    assert response.status_code == 200
    business.refresh_from_db()
    assert "barbershoplar" in business.search_text
    revalidated.assert_called_with("categories", "category:sartaroshxonalar", "businesses")
    # Ichki kategoriyaga ikonka berilmaydi
    response = root.call("PATCH", f"/admin/categories/{leaf.id}", {"iconKey": "food"})
    assert response.status_code == 400


def test_root_icon_change_applies_to_children(root: AdminClient) -> None:
    parent = category("sartaroshxonalar").parent
    assert parent is not None
    root.call("PATCH", f"/admin/categories/{parent.id}", {"iconKey": "sport"})
    rows = {r["slug"]: r for r in root.call("GET", "/admin/categories").json()}
    assert rows["sartaroshxonalar"]["iconKey"] == "sport"


def test_delete_rules(root: AdminClient) -> None:
    leaf = category("sartaroshxonalar")
    assert leaf.parent is not None
    assert (
        root.call("DELETE", f"/admin/categories/{leaf.parent.id}").json()["code"] == "has_children"
    )
    business = make_business(category=leaf)
    assert root.call("DELETE", f"/admin/categories/{leaf.id}").json()["code"] == "has_businesses"
    Business.objects.filter(pk=business.pk).delete()
    assert root.call("DELETE", f"/admin/categories/{leaf.id}").status_code == 204
    assert not Category.objects.filter(slug="sartaroshxonalar").exists()
    missing = "00000000-0000-4000-a000-000000000000"
    assert root.call("DELETE", f"/admin/categories/{missing}").status_code == 404


def test_attributes(root: AdminClient, client: Client) -> None:
    leaf = category("sartaroshxonalar")
    select = {
        "key": "soch_turi",
        "name": {"uz": "Soch turi", "ru": "Тип волос"},
        "type": "select",
        "unit": "e'tiborsiz",
        "options": [
            {"value": "qisqa", "label": {"uz": "Qisqa", "ru": "Короткие"}},
            {"value": "uzun", "label": {"uz": "Uzun", "ru": "Длинные"}},
        ],
        "filterable": True,
    }
    response = root.call(
        "PUT", f"/admin/categories/{leaf.id}/attributes", {"attributes": [ATTRIBUTE, select]}
    )
    assert response.status_code == 200
    saved = response.json()["attributes"]
    assert saved[1]["unit"] is None  # birlik faqat number uchun
    # Ommaviy kategoriya sahifasi joriy tilda ko'rsatadi
    public = client.get("/api/v1/categories/sartaroshxonalar?lang=ru")
    assert_matches_contract(public)
    assert public.json()["attributes"][1]["options"][0]["label"] == "Короткие"

    parent = leaf.parent
    assert parent is not None
    response = root.call("PUT", f"/admin/categories/{parent.id}/attributes", {"attributes": []})
    assert response.status_code == 400


@pytest.mark.parametrize(
    "attribute",
    [
        {**ATTRIBUTE, "key": "Katta"},
        {**ATTRIBUTE, "type": "rang"},
        {**ATTRIBUTE, "name": {"uz": "", "ru": "x"}},
        {
            **ATTRIBUTE,
            "type": "select",
            "options": [{"value": "bir", "label": {"uz": "Bir", "ru": "Один"}}],
        },
    ],
)
def test_attribute_validation(root: AdminClient, attribute: dict[str, Any]) -> None:
    leaf = category("sartaroshxonalar")
    response = root.call(
        "PUT", f"/admin/categories/{leaf.id}/attributes", {"attributes": [ATTRIBUTE, attribute]}
    )
    assert response.status_code == 400
    # Takror kalit ham, noto'g'ri qiymat ham — aynan shu elementda
    assert "attributes.1" in response.json()["fields"]
