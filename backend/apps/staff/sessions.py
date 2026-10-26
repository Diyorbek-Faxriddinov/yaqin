"""Admin sessiyalari va kirish challenge'lari (kontraktdagi adminSessionCookie).

- `adminsessionid` — HttpOnly, SameSite=Strict, 8 soat; productionda Secure. Bazada faqat xesh.
- `csrftoken` cookie'si mijoz sessiyasi bilan umumiy: ikkala sessiya ochiq bo'lsa, ikkalasida bir
  xil CSRF tokeni (yangi sessiya ochiq turgan boshqasining tokenini oladi) — aks holda biri
  ikkinchisini buzadi.
"""

import secrets
from datetime import timedelta

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.request import Request

from apps.accounts.sessions import (
    CSRF_COOKIE,
    SESSION_COOKIE,
    SESSION_TTL,
    find_session,
    hash_token,
)
from apps.staff.models import AdminSession, AdminUser, LoginChallenge

ADMIN_SESSION_COOKIE = "adminsessionid"
ADMIN_SESSION_TTL = timedelta(hours=8)
CHALLENGE_TTL = timedelta(minutes=5)
MAX_CODE_ATTEMPTS = 5


def create_admin_session(
    admin: AdminUser, csrf_token: str | None = None
) -> tuple[str, AdminSession]:
    token = secrets.token_urlsafe(32)
    session = AdminSession.objects.create(
        token_hash=hash_token(token),
        admin=admin,
        csrf_token=csrf_token or secrets.token_urlsafe(32),
        expires_at=timezone.now() + ADMIN_SESSION_TTL,
    )
    return token, session


def find_admin_session(token: str | None) -> AdminSession | None:
    if not token:
        return None
    return (
        AdminSession.objects.select_related("admin")
        .filter(token_hash=hash_token(token), expires_at__gt=timezone.now(), admin__is_active=True)
        .first()
    )


def customer_csrf_token(request: Request) -> str | None:
    """Ochiq mijoz sessiyasining CSRF tokeni (admin sessiyasi ham shuni oladi)."""
    session = find_session(request.COOKIES.get(SESSION_COOKIE))
    return session.csrf_token if session else None


def admin_csrf_token(request: Request) -> str | None:
    """Ochiq admin sessiyasining CSRF tokeni (mijoz kirganda ham shu saqlanadi)."""
    session = find_admin_session(request.COOKIES.get(ADMIN_SESSION_COOKIE))
    return session.csrf_token if session else None


def set_admin_cookies(response: HttpResponse, token: str, csrf_token: str) -> None:
    max_age = int(ADMIN_SESSION_TTL.total_seconds())
    secure = settings.SESSION_COOKIES_SECURE
    response.set_cookie(
        ADMIN_SESSION_COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        samesite="Strict",
        secure=secure,
    )
    # CSRF cookie mijoz sessiyasi bilan umumiy — mijoz sessiyasidan oldin tugab qolmasligi uchun
    # muddati mijozniki bilan bir xil (o'zi sessiya emas: sessiyasiz hech narsa bermaydi)
    response.set_cookie(
        CSRF_COOKIE,
        csrf_token,
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=False,
        samesite="Lax",
        secure=secure,
    )


def clear_admin_cookies(response: HttpResponse, keep_csrf: bool) -> None:
    response.delete_cookie(ADMIN_SESSION_COOKIE, samesite="Strict")
    if not keep_csrf:
        response.delete_cookie(CSRF_COOKIE, samesite="Lax")


def end_admin_sessions(admin: AdminUser) -> None:
    """O'chirish, parolni tiklash, rollar o'zgarganda (3.7) — barcha qurilmalardan chiqarish."""
    AdminSession.objects.filter(admin=admin).delete()
    LoginChallenge.objects.filter(admin=admin).delete()


def create_challenge(admin: AdminUser) -> tuple[str, LoginChallenge]:
    token = secrets.token_urlsafe(32)
    needs_setup = admin.must_change_password or not admin.totp_secret
    challenge = LoginChallenge.objects.create(
        token_hash=hash_token(token),
        admin=admin,
        next=LoginChallenge.Next.SETUP if needs_setup else LoginChallenge.Next.TOTP,
        expires_at=timezone.now() + CHALLENGE_TTL,
    )
    return token, challenge


def find_challenge(token: object) -> LoginChallenge | None:
    if not isinstance(token, str) or not token or len(token) > 128:
        return None
    return (
        LoginChallenge.objects.select_related("admin")
        .filter(token_hash=hash_token(token), expires_at__gt=timezone.now(), admin__is_active=True)
        .first()
    )
