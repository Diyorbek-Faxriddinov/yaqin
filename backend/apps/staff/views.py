"""Admin kirishi: login → (setup) → 2fa → sessiya; chiqish va `/admin/me`."""

from typing import Any

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import check_csrf
from apps.core.api import ApiError
from apps.staff import lockout, totp
from apps.staff.audit import audit
from apps.staff.authentication import AdminSessionAuthentication, IsAdmin, current_admin
from apps.staff.models import AdminUser, AuditEntry, LoginChallenge
from apps.staff.passwords import burn_time, hash_password, password_problems, verify_password
from apps.staff.sessions import (
    ADMIN_SESSION_COOKIE,
    CHALLENGE_TTL,
    MAX_CODE_ATTEMPTS,
    clear_admin_cookies,
    create_admin_session,
    create_challenge,
    customer_csrf_token,
    find_admin_session,
    find_challenge,
    set_admin_cookies,
)

Target = AuditEntry.TargetType


def admin_me(admin: AdminUser) -> dict[str, Any]:
    return {
        "id": str(admin.id),
        "username": admin.username,
        "displayName": admin.display_name,
        "isRoot": admin.is_root,
        "permissions": admin.permissions(),
    }


def body_of(request: Request) -> dict[str, Any]:
    return request.data if isinstance(request.data, dict) else {}


def invalid_credentials() -> ApiError:
    return ApiError(401, "invalid_credentials", "Login yoki parol notoʻgʻri")


def challenge_expired() -> ApiError:
    return ApiError(401, "challenge_expired", "Vaqt tugadi. Qaytadan kiring.")


def too_many_attempts() -> ApiError:
    return ApiError(429, "too_many_attempts", "Juda koʻp urinish. Keyinroq qayta urinib koʻring.")


class AdminAuthView(APIView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "admin_auth"


class AdminLoginView(AdminAuthView):
    def post(self, request: Request) -> Response:
        body = body_of(request)
        username = body.get("username")
        password = body.get("password")
        if not isinstance(username, str) or not isinstance(password, str) or len(password) > 256:
            raise invalid_credentials()
        username = username.strip().lower()[:64]
        ip = BaseThrottle().get_ident(request)
        if lockout.is_locked(ip, username):
            raise too_many_attempts()

        admin = AdminUser.objects.filter(username=username).first()
        if admin is None:
            burn_time(password)
            ok = False
        else:
            # O'chirilgan akkaunt ham "noto'g'ri parol" — holati oshkor qilinmaydi
            ok = verify_password(admin, password) and admin.is_active
        if admin is None or not ok:
            lockout.register_failure(ip, username)
            raise invalid_credentials()

        lockout.reset(ip, username)
        token, challenge = create_challenge(admin)
        return Response(
            {
                "challengeToken": token,
                "next": challenge.next,
                "mustChangePassword": admin.must_change_password,
            }
        )


class AdminSetupView(AdminAuthView):
    def post(self, request: Request) -> Response:
        body = body_of(request)
        challenge = find_challenge(body.get("challengeToken"))
        if challenge is None:
            raise challenge_expired()
        if challenge.next != LoginChallenge.Next.SETUP:
            raise ApiError(409, "setup_not_required", "2FA allaqachon sozlangan")
        admin = challenge.admin

        new_password = body.get("newPassword")
        if new_password is not None and not isinstance(new_password, str):
            new_password = ""
        if admin.must_change_password and not new_password:
            raise ApiError(
                400,
                "validation_error",
                "Maʼlumotlar notoʻgʻri",
                {"newPassword": ["Yangi parolni kiriting"]},
            )
        if new_password:
            problems = password_problems(new_password, admin)
            if problems:
                raise ApiError(
                    400, "validation_error", "Maʼlumotlar notoʻgʻri", {"newPassword": problems}
                )
            challenge.pending_password_hash = hash_password(new_password)

        secret = totp.new_secret()
        challenge.pending_totp_secret = totp.encrypt(secret)
        # Parolni o'ylab topish va QR'ni skanerlashga vaqt — muddat yangilanadi
        challenge.expires_at = timezone.now() + CHALLENGE_TTL
        challenge.save(update_fields=["pending_password_hash", "pending_totp_secret", "expires_at"])
        uri = totp.provisioning_uri(secret, admin.username)
        return Response({"secret": secret, "otpauthUri": uri, "qrDataUri": totp.qr_data_uri(uri)})


class AdminVerify2faView(AdminAuthView):
    def post(self, request: Request) -> Response:
        body = body_of(request)
        code = body.get("code")
        challenge = find_challenge(body.get("challengeToken"))
        if challenge is None:
            raise challenge_expired()
        if challenge.next == LoginChallenge.Next.SETUP and not challenge.pending_totp_secret:
            raise ApiError(401, "setup_required", "Avval 2FA ni sozlang. Qaytadan kiring.")

        attempts = challenge.attempts
        with transaction.atomic():
            # Bir xil kod bilan parallel so'rovlar ikkita sessiya ocholmasligi uchun qulf
            admin = AdminUser.objects.select_for_update().get(pk=challenge.admin_id)
            setup = challenge.next == LoginChallenge.Next.SETUP
            encrypted = challenge.pending_totp_secret if setup else admin.totp_secret
            secret = totp.decrypt(encrypted) if encrypted else None
            last_step = None if setup else admin.totp_last_step
            step = (
                totp.verify(secret, code, last_step) if secret and isinstance(code, str) else None
            )

            if step is None:
                attempts += 1
                if attempts >= MAX_CODE_ATTEMPTS:
                    challenge.delete()
                else:
                    LoginChallenge.objects.filter(pk=challenge.pk).update(
                        attempts=F("attempts") + 1
                    )
            else:
                if setup:
                    admin.totp_secret = challenge.pending_totp_secret
                    if challenge.pending_password_hash:
                        admin.password_hash = challenge.pending_password_hash
                    admin.must_change_password = False
                admin.totp_last_step = step
                admin.last_login_at = timezone.now()
                admin.save()
                LoginChallenge.objects.filter(admin=admin).delete()
                token, session = create_admin_session(admin, customer_csrf_token(request))
                if setup:
                    audit(admin, "auth.setup", Target.AUTH, admin.id, "Parol va 2FA sozlandi")
                audit(admin, "auth.login", Target.AUTH, admin.id, f"Kirdi: {admin.username}")

        if step is None:
            if attempts >= MAX_CODE_ATTEMPTS:
                raise ApiError(429, "too_many_attempts", "Juda koʻp urinish. Qaytadan kiring.")
            raise ApiError(401, "invalid_code", "Kod notoʻgʻri")
        response = Response(admin_me(admin))
        set_admin_cookies(response, token, session.csrf_token)
        return response


class AdminLogoutView(APIView):
    def post(self, request: Request) -> Response:
        session = find_admin_session(request.COOKIES.get(ADMIN_SESSION_COOKIE))
        if session is not None:
            check_csrf(request, session.csrf_token)
            audit(session.admin, "auth.logout", Target.AUTH, session.admin_id, "Chiqdi")
            session.delete()
        response = Response(status=204)
        clear_admin_cookies(response, keep_csrf=customer_csrf_token(request) is not None)
        return response


class AdminMeView(APIView):
    authentication_classes = [AdminSessionAuthentication]
    permission_classes = [IsAdmin]

    def get(self, request: Request) -> Response:
        return Response(admin_me(current_admin(request)))
