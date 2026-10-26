"""Admin API: administratorlar, rollar, audit jurnali, sozlamalar."""

from collections.abc import Iterator
from unittest.mock import MagicMock, patch

import pytest
from django.test import Client

from apps.core.models import PlatformSettings
from apps.staff.audit import audit
from apps.staff.models import AdminSession, AdminUser, AuditEntry, Role
from apps.staff.sessions import create_admin_session
from tests.admin_api import AdminClient, admin_with
from tests.contract import assert_matches_contract
from tests.factories import make_admin

pytestmark = pytest.mark.django_db

ANALYST = "Tahlilchi"


@pytest.fixture
def root(client: Client) -> AdminClient:
    return AdminClient(client, make_admin(is_root=True, username="bosh"))


def role_id(name: str) -> str:
    return str(Role.objects.get(name=name).id)


# --- Administratorlar ---


def test_staff_view_vs_manage(client: Client) -> None:
    viewer = admin_with(client, extra=("staff.manage",))
    assert viewer.call("GET", "/admin/staff").status_code == 200
    assert viewer.call("GET", "/admin/roles").status_code == 200
    # O'zgartirish — faqat Root (staff.manage bilan ham emas)
    body = {"username": "yangi", "displayName": "Yangi", "roleIds": [], "extraPermissions": []}
    response = viewer.call("POST", "/admin/staff", body)
    assert response.status_code == 403
    assert response.json()["code"] == "root_required"
    assert admin_with(client).call("GET", "/admin/staff").status_code == 403


def test_create_staff_and_first_login(root: AdminClient, client: Client) -> None:
    body = {
        "username": "Malika.R",
        "displayName": "Malika Rahimova",
        "roleIds": [role_id(ANALYST)],
        "extraPermissions": ["review.moderate"],
    }
    response = root.call("POST", "/admin/staff", body)
    assert response.status_code == 201
    created = response.json()
    staff, password = created["staff"], created["temporaryPassword"]
    assert staff["username"] == "malika.r"
    assert len(password) >= 12
    sources = {p["permission"]: p["sources"] for p in staff["effectivePermissions"]}
    assert sources["review.moderate"] == [{"type": "direct"}]
    assert sources["stats.view"][0]["role"]["name"] == ANALYST
    admin = AdminUser.objects.get(username="malika.r")
    assert admin.must_change_password
    assert admin.totp_secret == ""
    assert password not in admin.password_hash
    assert AuditEntry.objects.filter(action="admin.create").exists()

    # Vaqtinchalik parol bilan kirish — sozlash bosqichi
    login = Client().post(
        "/api/v1/admin/auth/login",
        {"username": "malika.r", "password": password},
        content_type="application/json",
    )
    assert_matches_contract(login)
    assert login.json()["next"] == "setup"
    assert login.json()["mustChangePassword"] is True
    assert root.call("POST", "/admin/staff", body).status_code == 409


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"username": "1abc"}, "username"),
        ({"displayName": "M"}, "displayName"),
        ({"roleIds": ["00000000-0000-4000-a000-000000000000"]}, "roleIds"),
        ({"extraPermissions": ["root"]}, "extraPermissions"),
    ],
)
def test_create_staff_validation(root: AdminClient, change: dict[str, object], field: str) -> None:
    body = {
        "username": "yangi",
        "displayName": "Yangi",
        "roleIds": [],
        "extraPermissions": [],
        **change,
    }
    response = root.call("POST", "/admin/staff", body)
    assert response.status_code == 400
    assert field in response.json()["fields"]


def test_update_staff(root: AdminClient) -> None:
    admin = make_admin()
    create_admin_session(admin)
    url = f"/admin/staff/{admin.id}"
    body = root.call(
        "PATCH", url, {"roleIds": [role_id(ANALYST)], "displayName": "Yangi ism"}
    ).json()
    assert [r["name"] for r in body["roles"]] == [ANALYST]
    assert AdminSession.objects.filter(admin=admin).exists()

    response = root.call("PATCH", url, {"displayName": "M", "isActive": "ha"})
    assert set(response.json()["fields"]) == {"displayName", "isActive"}
    body = root.call("PATCH", url, {"isActive": False}).json()
    assert body["isActive"] is False
    # O'chirilgan administrator darhol chiqariladi
    assert not AdminSession.objects.filter(admin=admin).exists()
    entry = AuditEntry.objects.filter(action="admin.update").latest("at")
    assert "oʻchirildi" in entry.summary


def test_root_is_immutable(root: AdminClient) -> None:
    url = f"/admin/staff/{root.admin.id}"
    assert root.call("PATCH", url, {"isActive": False}).json()["code"] == "root_immutable"
    assert root.call("POST", f"{url}/reset-password").status_code == 403
    missing = "00000000-0000-4000-a000-000000000000"
    assert root.call("PATCH", f"/admin/staff/{missing}", {}).status_code == 404


def test_reset_password(root: AdminClient) -> None:
    admin = make_admin()
    create_admin_session(admin)
    response = root.call("POST", f"/admin/staff/{admin.id}/reset-password")
    assert response.status_code == 200
    password = response.json()["temporaryPassword"]
    admin.refresh_from_db()
    # Keyingi kirishda yangi parol va 2FA qaytadan sozlanadi
    assert admin.must_change_password
    assert admin.totp_secret == ""
    assert not AdminSession.objects.filter(admin=admin).exists()
    login = Client().post(
        "/api/v1/admin/auth/login",
        {"username": admin.username, "password": password},
        content_type="application/json",
    )
    assert login.json()["next"] == "setup"


# --- Rollar ---


def test_roles_crud(root: AdminClient) -> None:
    rows = {r["name"]: r for r in root.call("GET", "/admin/roles").json()}
    assert rows[ANALYST]["isBuiltIn"] is True
    body = {
        "name": "Hisobotchi",
        "description": None,
        "permissions": ["stats.view", "business.view"],
    }
    created = root.call("POST", "/admin/roles", body).json()
    # Kontraktdagi tartibda
    assert created["permissions"] == ["business.view", "stats.view"]
    assert root.call("POST", "/admin/roles", {**body, "name": "hisobotchi"}).status_code == 400

    admin = make_admin()
    admin.roles.add(Role.objects.get(pk=created["id"]))
    url = f"/admin/roles/{created['id']}"
    updated = root.call("PATCH", url, {**body, "permissions": ["audit.view"]}).json()
    assert updated["adminCount"] == 1
    # Shu roldagi administratorga darhol ta'sir qiladi
    assert admin.permissions() == ["audit.view"]

    assert root.call("DELETE", url).json()["code"] == "role_in_use"
    admin.roles.clear()
    assert root.call("DELETE", url).status_code == 204
    built_in = role_id(ANALYST)
    assert root.call("DELETE", f"/admin/roles/{built_in}").json()["code"] == "built_in_role"
    response = root.call("POST", "/admin/roles", {**body, "permissions": []})
    assert response.status_code == 400
    built_in_url = f"/admin/roles/{built_in}"
    assert root.call("PATCH", built_in_url, {**body, "name": "X"}).status_code == 400


# --- Audit ---


def test_audit_list(client: Client, root: AdminClient) -> None:
    other = make_admin()
    audit(other, "business.update", AuditEntry.TargetType.BUSINESS, "b1", "Tahrir")
    audit(None, "admin.create_root", AuditEntry.TargetType.ADMIN, "r1", "Root")
    viewer = admin_with(client, roles=(ANALYST,))
    items = viewer.call("GET", "/admin/audit").json()["items"]
    assert items[0]["action"] == "admin.create_root"  # eng yangisi birinchi
    assert items[0]["admin"] is None
    by_admin = viewer.call("GET", f"/admin/audit?adminId={other.id}").json()["items"]
    assert [i["action"] for i in by_admin] == ["business.update"]
    by_type = viewer.call("GET", "/admin/audit?targetType=admin").json()["items"]
    assert {i["targetType"] for i in by_type} == {"admin"}
    assert viewer.call("GET", "/admin/audit?targetType=boshqa").status_code == 400
    assert admin_with(client, roles=("Moderator",)).call("GET", "/admin/audit").status_code == 403


# --- Sozlamalar ---


@pytest.fixture
def revalidated() -> Iterator[MagicMock]:
    with patch("apps.core.admin_views.revalidate") as mock:
        yield mock


def test_settings(root: AdminClient, client: Client, revalidated: MagicMock) -> None:
    current = root.call("GET", "/admin/settings").json()
    assert current["reviewsPremoderation"] is True
    body = {
        "reviewsPremoderation": False,
        "businessRequestsOpen": False,
        "contacts": {"telegram": "@yaqin_uz", "email": "salom@yaqin.uz", "phone": "+998901234567"},
    }
    saved = root.call("PUT", "/admin/settings", body).json()
    assert saved["contacts"]["telegram"] == "yaqin_uz"
    settings = PlatformSettings.load()
    assert (settings.reviews_premoderation, settings.business_requests_open) == (False, False)
    revalidated.assert_called_with("settings")
    public = client.get("/api/v1/settings")
    assert_matches_contract(public)
    assert public.json()["businessRequestsOpen"] is False
    entry = AuditEntry.objects.get(action="settings.update")
    assert entry.summary == "sharhlar moderatsiyasi, soʻrov formasi, kontaktlar"

    bad = {**body, "contacts": {"telegram": "ab", "email": "yoq", "phone": "123"}}
    response = root.call("PUT", "/admin/settings", bad)
    assert response.status_code == 400
    assert set(response.json()["fields"]) == {
        "contacts.telegram",
        "contacts.email",
        "contacts.phone",
    }
    assert root.call("PUT", "/admin/settings", {"contacts": {}}).status_code == 400
    assert (
        admin_with(client, roles=("Moderator",)).call("GET", "/admin/settings").status_code == 403
    )
