"""Mijoz sessiyalari va cookie'lar (ADR-0012, kontraktdagi sessionCookie).

- `sessionid` — HttpOnly, SameSite=Lax, 30 kun; productionda Secure. Qiymati tasodifiy token,
  bazada esa faqat uning SHA-256 xeshi.
- `csrftoken` — JS o'qiy oladi (HttpOnly emas). O'zgartiruvchi so'rovlarda `X-CSRFToken`
  sarlavhasi cookie va sessiyadagi token bilan bir xil bo'lishi shart (double-submit).
"""

import hashlib
import secrets
from datetime import timedelta

from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone

from apps.accounts.models import CustomerSession, User

SESSION_COOKIE = "sessionid"
CSRF_COOKIE = "csrftoken"
CSRF_HEADER = "HTTP_X_CSRFTOKEN"
SESSION_TTL = timedelta(days=30)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(user: User) -> tuple[str, CustomerSession]:
    token = secrets.token_urlsafe(32)
    session = CustomerSession.objects.create(
        token_hash=hash_token(token),
        user=user,
        csrf_token=secrets.token_urlsafe(32),
        expires_at=timezone.now() + SESSION_TTL,
    )
    return token, session


def find_session(token: str | None) -> CustomerSession | None:
    if not token:
        return None
    session = (
        CustomerSession.objects.select_related("user")
        .filter(token_hash=hash_token(token), expires_at__gt=timezone.now())
        .first()
    )
    if session is None or session.user.is_blocked:
        return None
    return session


def set_session_cookies(response: HttpResponse, token: str, csrf_token: str) -> None:
    max_age = int(SESSION_TTL.total_seconds())
    secure = settings.SESSION_COOKIES_SECURE
    response.set_cookie(
        SESSION_COOKIE, token, max_age=max_age, httponly=True, samesite="Lax", secure=secure
    )
    response.set_cookie(
        CSRF_COOKIE, csrf_token, max_age=max_age, httponly=False, samesite="Lax", secure=secure
    )


def clear_session_cookies(response: HttpResponse) -> None:
    response.delete_cookie(SESSION_COOKIE, samesite="Lax")
    response.delete_cookie(CSRF_COOKIE, samesite="Lax")


def end_all_sessions(user: User) -> None:
    """Bloklash va akkauntni o'chirishda — barcha qurilmalardan chiqarish."""
    CustomerSession.objects.filter(user=user).delete()
