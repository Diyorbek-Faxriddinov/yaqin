"""Admin kirishi (parol + TOTP), birinchi sozlash, sessiya, ruxsatlar, audit jurnali, `createroot`.

Har bir HTTP javob kontraktga qarshi tekshiriladi.
"""

import io
import json
from datetime import timedelta
from typing import Any
from unittest.mock import patch

import pyotp
import pytest
import yaml
from django.conf import settings
from django.core.management import CommandError, call_command
from django.db import DatabaseError, IntegrityError, connection, transaction
from django.db.models import ProtectedError
from django.test import Client
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from apps.accounts.sessions import create_session
from apps.staff import lockout, totp
from apps.staff.audit import audit
from apps.staff.authentication import AdminSessionAuthentication, IsAdmin
from apps.staff.models import AdminSession, AdminUser, AuditEntry, LoginChallenge, Role
from apps.staff.permissions import ALL_PERMISSIONS, BUILT_IN_ROLES
from apps.staff.sessions import create_admin_session
from tests.contract import assert_matches_contract
from tests.factories import ADMIN_PASSWORD, TOTP_SECRET, make_admin, make_user

pytestmark = pytest.mark.django_db

NEW_PASSWORD = "Kuzgi-Barglar-Shamol-77"


def call(
    client: Client,
    method: str,
    path: str,
    body: Any = None,
    csrf: str | None = None,
    ip: str = "127.0.0.1",
) -> Any:
    response = client.generic(
        method,
        f"/api/v1{path}",
        data="" if body is None else json.dumps(body),
        content_type="application/json",
        headers={"X-CSRFToken": csrf} if csrf else {},
        REMOTE_ADDR=ip,
    )
    assert_matches_contract(response)
    return response


def code_for(secret: str = TOTP_SECRET) -> str:
    return pyotp.TOTP(secret).now()


def login(client: Client, username: str, password: str = ADMIN_PASSWORD, **kw: Any) -> Any:
    return call(
        client, "POST", "/admin/auth/login", {"username": username, "password": password}, **kw
    )


def full_login(client: Client, admin: AdminUser) -> Any:
    token = login(client, admin.username).json()["challengeToken"]
    response = call(
        client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code_for()}
    )
    assert response.status_code == 200
    return response


def schema_enum(name: str) -> list[str]:
    spec = yaml.safe_load(settings.OPENAPI_CONTRACT.read_text(encoding="utf-8"))
    return list(spec["components"]["schemas"][name]["enum"])


# --- Kontrakt va tizim rollari ---


def test_permissions_match_contract() -> None:
    assert list(ALL_PERMISSIONS) == schema_enum("AdminPermission")


def test_audit_target_types_match_contract() -> None:
    assert list(AuditEntry.TargetType.values) == schema_enum("AuditTargetType")


def test_built_in_roles_seeded() -> None:
    roles = {r.name: r for r in Role.objects.filter(is_built_in=True)}
    assert set(roles) == {name for name, _, _ in BUILT_IN_ROLES}
    assert roles["Moderator"].permissions == ["review.moderate", "complaint.manage", "user.view"]


# --- TOTP ---


def test_totp_secret_encrypted_at_rest() -> None:
    token = totp.encrypt(TOTP_SECRET)
    assert TOTP_SECRET not in token
    assert totp.decrypt(token) == TOTP_SECRET
    assert totp.decrypt("buzilgan-qiymat") is None


def test_totp_verify_window_and_replay() -> None:
    now = 1_800_000_000
    step = int(now // 30)
    otp = pyotp.TOTP(TOTP_SECRET)
    assert totp.verify(TOTP_SECRET, otp.at(now), None, now=now) == step
    assert totp.verify(TOTP_SECRET, otp.at(now - 30), None, now=now) == step - 1
    assert totp.verify(TOTP_SECRET, otp.at(now + 30), None, now=now) == step + 1
    assert totp.verify(TOTP_SECRET, otp.at(now - 60), None, now=now) is None
    # Ishlatilgan qadam va undan oldingilari qabul qilinmaydi
    assert totp.verify(TOTP_SECRET, otp.at(now), step, now=now) is None
    assert totp.verify(TOTP_SECRET, "12a456", None, now=now) is None


def test_qr_is_svg_data_uri() -> None:
    uri = totp.provisioning_uri(TOTP_SECRET, "malika")
    assert uri.startswith("otpauth://totp/Yaqin:malika?")
    assert totp.qr_data_uri(uri).startswith("data:image/svg+xml;base64,")


# --- 1-qadam: login ---


def test_login_returns_totp_challenge(client: Client) -> None:
    admin = make_admin()
    assert admin.password_hash.startswith("argon2")
    response = login(client, f"  {admin.username.upper()} ")
    assert response.status_code == 200
    body = response.json()
    assert body["next"] == "totp"
    assert body["mustChangePassword"] is False
    # Sessiya hali ochilmaydi
    assert "adminsessionid" not in response.cookies
    assert LoginChallenge.objects.filter(admin=admin).count() == 1


@pytest.mark.parametrize("case", ["wrong_password", "unknown_user", "inactive", "bad_input"])
def test_login_failures_look_identical(client: Client, case: str) -> None:
    admin = make_admin(is_active=case != "inactive")
    body: Any = {"username": admin.username, "password": ADMIN_PASSWORD}
    if case == "wrong_password":
        body["password"] = "notogri-parol-123"
    elif case == "unknown_user":
        body["username"] = "yoq-admin"
    elif case == "bad_input":
        body = {"username": 5, "password": None}
    response = call(client, "POST", "/admin/auth/login", body)
    assert response.status_code == 401
    assert response.json() == {
        "code": "invalid_credentials",
        "message": "Login yoki parol notoʻgʻri",
    }


def test_unknown_user_still_runs_password_hasher(client: Client) -> None:
    with patch("apps.staff.views.burn_time") as burn:
        login(client, "yoq-admin")
    burn.assert_called_once()


def test_lockout_by_ip_and_username(client: Client) -> None:
    admin = make_admin()
    for _ in range(lockout.MAX_PER_PAIR):
        assert login(client, admin.username, "notogri-parol-123").status_code == 401
    # To'g'ri parol bilan ham — bloklangan
    response = login(client, admin.username)
    assert response.status_code == 429
    assert response.json()["code"] == "too_many_attempts"
    # Boshqa IP'dan — ishlaydi (haqiqiy adminni begona odam bloklay olmaydi)
    assert login(client, admin.username, ip="10.0.0.9").status_code == 200


def test_successful_login_resets_pair_counter(client: Client) -> None:
    admin = make_admin()
    for _ in range(lockout.MAX_PER_PAIR - 1):
        login(client, admin.username, "notogri-parol-123")
    assert login(client, admin.username).status_code == 200
    for _ in range(lockout.MAX_PER_PAIR - 1):
        assert login(client, admin.username, "notogri-parol-123").status_code == 401


def test_lockout_by_username_across_ips(client: Client) -> None:
    admin = make_admin()
    for n in range(lockout.MAX_PER_USERNAME):
        login(client, admin.username, "notogri-parol-123", ip=f"10.1.{n}.1")
    assert login(client, admin.username, ip="10.2.0.1").status_code == 429


# --- 2-qadam: TOTP ---


def test_2fa_opens_admin_session(client: Client) -> None:
    admin = make_admin()
    token = login(client, admin.username).json()["challengeToken"]
    response = call(
        client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code_for()}
    )
    assert response.status_code == 200
    assert response.json() == {
        "id": str(admin.id),
        "username": admin.username,
        "displayName": admin.display_name,
        "isRoot": False,
        "permissions": [],
    }
    cookie = response.cookies["adminsessionid"]
    assert cookie["httponly"]
    assert cookie["samesite"] == "Strict"
    assert cookie["max-age"] == 8 * 60 * 60
    assert not response.cookies["csrftoken"]["httponly"]
    session = AdminSession.objects.get(admin=admin)
    assert session.token_hash != cookie.value
    admin.refresh_from_db()
    assert admin.last_login_at is not None
    assert AuditEntry.objects.filter(admin=admin, action="auth.login").exists()
    # Challenge bir martalik
    again = call(client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code_for()})
    assert again.status_code == 401
    assert again.json()["code"] == "challenge_expired"


def test_2fa_code_cannot_be_reused(client: Client) -> None:
    admin = make_admin()
    code = code_for()
    token = login(client, admin.username).json()["challengeToken"]
    assert (
        call(client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code}).status_code
        == 200
    )
    token = login(client, admin.username).json()["challengeToken"]
    response = call(client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code})
    assert response.status_code == 401
    assert response.json()["code"] == "invalid_code"


def test_2fa_wrong_codes_cancel_challenge(client: Client) -> None:
    admin = make_admin()
    token = login(client, admin.username).json()["challengeToken"]
    wrong = "000000" if code_for() != "000000" else "111111"
    for _ in range(4):
        response = call(client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": wrong})
        assert response.status_code == 401
    response = call(client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": wrong})
    assert response.status_code == 429
    assert not LoginChallenge.objects.exists()
    response = call(
        client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code_for()}
    )
    assert response.status_code == 401


def test_2fa_expired_challenge(client: Client) -> None:
    admin = make_admin()
    token = login(client, admin.username).json()["challengeToken"]
    LoginChallenge.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    response = call(
        client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code_for()}
    )
    assert response.status_code == 401
    assert response.json()["code"] == "challenge_expired"


def test_2fa_rejected_for_deactivated_admin(client: Client) -> None:
    admin = make_admin()
    token = login(client, admin.username).json()["challengeToken"]
    AdminUser.objects.filter(pk=admin.pk).update(is_active=False)
    response = call(
        client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code_for()}
    )
    assert response.status_code == 401


# --- Birinchi kirish: setup ---


def setup_admin() -> AdminUser:
    """Root yaratgan yangi admin: vaqtinchalik parol, TOTP yo'q."""
    return make_admin(must_change_password=True, totp_secret=None)


def test_first_login_requires_setup(client: Client) -> None:
    admin = setup_admin()
    body = login(client, admin.username).json()
    assert body["next"] == "setup"
    assert body["mustChangePassword"] is True
    # Setup qilmasdan 2fa — yo'q
    response = call(
        client,
        "POST",
        "/admin/auth/2fa",
        {"challengeToken": body["challengeToken"], "code": "123456"},
    )
    assert response.status_code == 401
    assert response.json()["code"] == "setup_required"


def test_setup_requires_new_password(client: Client) -> None:
    admin = setup_admin()
    token = login(client, admin.username).json()["challengeToken"]
    response = call(client, "POST", "/admin/auth/setup", {"challengeToken": token})
    assert response.status_code == 400
    assert response.json()["fields"] == {"newPassword": ["Yangi parolni kiriting"]}


@pytest.mark.parametrize(
    ("password", "message"),
    [
        ("Qisqa-1", "Parol kamida 12 belgidan iborat boʻlishi kerak"),
        ("839201746351", "Parol faqat raqamlardan iborat boʻlmasligi kerak"),
        (ADMIN_PASSWORD, "Yangi parol avvalgisidan farq qilishi kerak"),
    ],
)
def test_setup_password_rules(client: Client, password: str, message: str) -> None:
    admin = setup_admin()
    token = login(client, admin.username).json()["challengeToken"]
    response = call(
        client, "POST", "/admin/auth/setup", {"challengeToken": token, "newPassword": password}
    )
    assert response.status_code == 400
    assert message in response.json()["fields"]["newPassword"]


def test_setup_then_2fa_activates_password_and_totp(client: Client) -> None:
    admin = setup_admin()
    old_hash = admin.password_hash
    token = login(client, admin.username).json()["challengeToken"]
    response = call(
        client, "POST", "/admin/auth/setup", {"challengeToken": token, "newPassword": NEW_PASSWORD}
    )
    assert response.status_code == 200
    secret = response.json()["secret"]
    assert response.json()["otpauthUri"].startswith(f"otpauth://totp/Yaqin:{admin.username}?")
    # Kod tasdiqlanmaguncha akkaunt o'zgarmaydi
    admin.refresh_from_db()
    assert admin.password_hash == old_hash
    assert admin.totp_secret == ""

    response = call(
        client, "POST", "/admin/auth/2fa", {"challengeToken": token, "code": code_for(secret)}
    )
    assert response.status_code == 200
    admin.refresh_from_db()
    assert admin.must_change_password is False
    assert secret not in admin.totp_secret
    assert totp.decrypt(admin.totp_secret) == secret
    assert AuditEntry.objects.filter(admin=admin, action="auth.setup").exists()
    # Eski parol endi ishlamaydi, yangisi — ishlaydi va keyingi safar faqat TOTP so'raladi
    assert login(client, admin.username).status_code == 401
    assert login(client, admin.username, NEW_PASSWORD).json()["next"] == "totp"


def test_setup_without_password_change(client: Client) -> None:
    # Root: parolni o'zi tanlagan, faqat TOTP sozlanadi
    admin = make_admin(is_root=True, totp_secret=None)
    body = login(client, admin.username).json()
    assert body == {**body, "next": "setup", "mustChangePassword": False}
    response = call(
        client,
        "POST",
        "/admin/auth/setup",
        {"challengeToken": body["challengeToken"], "newPassword": None},
    )
    assert response.status_code == 200


def test_setup_not_allowed_when_totp_configured(client: Client) -> None:
    admin = make_admin()
    token = login(client, admin.username).json()["challengeToken"]
    response = call(client, "POST", "/admin/auth/setup", {"challengeToken": token})
    assert response.status_code == 409


def test_setup_with_unknown_challenge(client: Client) -> None:
    response = call(client, "POST", "/admin/auth/setup", {"challengeToken": "yoq"})
    assert response.status_code == 401


# --- Sessiya, /admin/me, chiqish ---


def test_admin_me_requires_admin_session(client: Client) -> None:
    response = call(client, "GET", "/admin/me")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"
    # Mijoz sessiyasi admin huquqini bermaydi
    token, _ = create_session(make_user())
    client.cookies["sessionid"] = token
    assert call(client, "GET", "/admin/me").status_code == 401


def test_admin_me_effective_permissions(client: Client) -> None:
    admin = make_admin(extra_permissions=["stats.view", "review.moderate"])
    admin.roles.add(Role.objects.get(name="Moderator"))
    full_login(client, admin)
    response = call(client, "GET", "/admin/me")
    assert response.status_code == 200
    # Takrorlanmaydi, kontraktdagi tartibda
    assert response.json()["permissions"] == [
        "review.moderate",
        "complaint.manage",
        "user.view",
        "stats.view",
    ]


def test_root_has_all_permissions(client: Client) -> None:
    full_login(client, make_admin(is_root=True))
    body = call(client, "GET", "/admin/me").json()
    assert body["isRoot"] is True
    assert body["permissions"] == list(ALL_PERMISSIONS)


@pytest.mark.parametrize("change", ["deactivated", "expired"])
def test_admin_session_invalidated(client: Client, change: str) -> None:
    admin = make_admin()
    full_login(client, admin)
    if change == "deactivated":
        AdminUser.objects.filter(pk=admin.pk).update(is_active=False)
    else:
        AdminSession.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
    assert call(client, "GET", "/admin/me").status_code == 401


def test_admin_logout(client: Client) -> None:
    admin = make_admin()
    csrf = full_login(client, admin).cookies["csrftoken"].value
    response = call(client, "POST", "/admin/auth/logout")
    assert response.status_code == 403
    response = call(client, "POST", "/admin/auth/logout", csrf=csrf)
    assert response.status_code == 204
    assert not AdminSession.objects.exists()
    assert response.cookies["adminsessionid"].value == ""
    assert AuditEntry.objects.filter(admin=admin, action="auth.logout").exists()
    # Sessiyasiz — shunchaki 204
    assert call(client, "POST", "/admin/auth/logout").status_code == 204


def test_csrf_token_shared_with_customer_session(client: Client) -> None:
    token, customer_session = create_session(make_user())
    client.cookies["sessionid"] = token
    response = full_login(client, make_admin())
    assert response.cookies["csrftoken"].value == customer_session.csrf_token
    assert AdminSession.objects.get().csrf_token == customer_session.csrf_token
    # Admin chiqsa, mijoz sessiyasining CSRF cookie'si o'chirilmaydi
    response = call(client, "POST", "/admin/auth/logout", csrf=customer_session.csrf_token)
    assert response.status_code == 204
    assert "csrftoken" not in response.cookies


def test_customer_login_keeps_admin_csrf_token(client: Client) -> None:
    admin_csrf = full_login(client, make_admin()).cookies["csrftoken"].value
    with patch("apps.accounts.views.settings.DEMO_LOGIN_ENABLED", True):
        response = client.post("/api/v1/auth/demo")
    assert response.status_code == 200
    assert response.cookies["csrftoken"].value == admin_csrf
    # Mijoz chiqsa — admin sessiyasi ishlashda davom etadi
    response = client.post("/api/v1/auth/logout", headers={"X-CSRFToken": admin_csrf})
    assert response.status_code == 204
    assert "csrftoken" not in response.cookies
    assert call(client, "GET", "/admin/me").status_code == 200


# --- Ruxsatlar (IsAdmin) ---


class StatsProbe(APIView):
    authentication_classes = [AdminSessionAuthentication]
    permission_classes = [IsAdmin]
    admin_permission = "stats.view"
    admin_permissions = {"POST": "root"}

    def get(self, request: Request) -> Response:
        return Response({"ok": True})

    def post(self, request: Request) -> Response:
        return Response({"ok": True})


def probe(admin: AdminUser | None, method: str = "get") -> Response:
    factory = APIRequestFactory()
    request = getattr(factory, method)("/probe")
    if admin is not None:
        token, session = create_admin_session(admin)
        request.COOKIES["adminsessionid"] = token
        request.COOKIES["csrftoken"] = session.csrf_token
        request.META["HTTP_X_CSRFTOKEN"] = session.csrf_token
    response: Response = StatsProbe.as_view()(request)
    return response


def test_permission_checks() -> None:
    assert probe(None).status_code == 401
    no_rights = make_admin()
    assert probe(no_rights).status_code == 403
    assert probe(no_rights).data["code"] == "permission_denied"
    analyst = make_admin()
    analyst.roles.add(Role.objects.get(name="Tahlilchi"))
    assert probe(analyst).status_code == 200
    assert probe(analyst, "post").data["code"] == "root_required"
    assert probe(make_admin(is_root=True), "post").status_code == 200


# --- Audit jurnali va DB cheklovlari ---


def test_audit_journal_is_append_only() -> None:
    admin = make_admin()
    entry = audit(admin, "business.update", AuditEntry.TargetType.BUSINESS, "x", "Tahrirlandi")
    for attempt in (
        lambda: AuditEntry.objects.filter(pk=entry.pk).update(summary="o'zgartirildi"),
        lambda: AuditEntry.objects.filter(pk=entry.pk).delete(),
    ):
        with pytest.raises(DatabaseError), transaction.atomic():
            attempt()
    with pytest.raises(DatabaseError), transaction.atomic(), connection.cursor() as cursor:
        cursor.execute("TRUNCATE staff_auditentry")
    # Jurnalda yozuvi bor administratorni o'chirib bo'lmaydi (faqat o'chirish — is_active)
    with pytest.raises(ProtectedError), transaction.atomic():
        admin.delete()
    assert AuditEntry.objects.get(pk=entry.pk).summary == "Tahrirlandi"


@pytest.mark.parametrize(
    "fields",
    [
        {"username": "Katta-Harf"},
        {"username": "ab"},
        {"is_root": True, "is_active": False},
    ],
)
def test_admin_db_constraints(fields: dict[str, Any]) -> None:
    with pytest.raises(IntegrityError), transaction.atomic():
        make_admin(**fields)


def test_single_root() -> None:
    make_admin(is_root=True)
    with pytest.raises(IntegrityError), transaction.atomic():
        make_admin(is_root=True)


# --- createroot ---


def createroot(password: str, username: str = "bosh") -> str:
    out = io.StringIO()
    with patch("sys.stdin", io.StringIO(password + "\n")):
        call_command(
            "createroot",
            username=username,
            display_name="Bosh administrator",
            password_stdin=True,
            stdout=out,
        )
    return out.getvalue()


def test_createroot() -> None:
    assert "Root yaratildi" in createroot(NEW_PASSWORD)
    root = AdminUser.objects.get(is_root=True)
    assert root.username == "bosh"
    assert root.must_change_password is False
    assert root.totp_secret == ""
    assert root.password_hash.startswith("argon2")
    assert AuditEntry.objects.filter(action="admin.create_root", target_id=str(root.id)).exists()
    with pytest.raises(CommandError, match="allaqachon"):
        createroot(NEW_PASSWORD, username="ikkinchi")


@pytest.mark.parametrize(
    ("password", "username", "error"),
    [
        ("qisqa", "bosh", "12 belgi"),
        (NEW_PASSWORD, "Bosh Admin", "Login"),
    ],
)
def test_createroot_validation(password: str, username: str, error: str) -> None:
    with pytest.raises(CommandError, match=error):
        createroot(password, username)
    assert not AdminUser.objects.exists()
