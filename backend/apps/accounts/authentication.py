"""DRF autentifikatsiyasi: mijoz sessiyasi + CSRF double-submit (ADR-0012)."""

import secrets
from typing import Any

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from apps.accounts.models import CustomerSession, User
from apps.accounts.sessions import CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, find_session
from apps.core.api import ApiError

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def csrf_failed() -> ApiError:
    return ApiError(403, "csrf_failed", "Xavfsizlik tekshiruvi oʻtmadi. Sahifani yangilang.")


def check_csrf(request: Request, expected: str) -> None:
    """Sarlavha = cookie = sessiyadagi token (vaqtga chidamli taqqoslash). Admin sessiyasi ham."""
    header = request.META.get(CSRF_HEADER, "")
    cookie = request.COOKIES.get(CSRF_COOKIE, "")
    if not (
        header
        and secrets.compare_digest(header, cookie)
        and secrets.compare_digest(header, expected)
    ):
        raise csrf_failed()


class CustomerSessionAuthentication(BaseAuthentication):
    def authenticate(self, request: Request) -> tuple[User, CustomerSession] | None:
        session = find_session(request.COOKIES.get(SESSION_COOKIE))
        if session is None:
            return None
        if request.method not in SAFE_METHODS:
            check_csrf(request, session.csrf_token)
        return session.user, session

    def authenticate_header(self, request: Request) -> str:
        # Bo'sh bo'lmasa DRF kirilmaganlarga 403 emas, 401 qaytaradi (kontrakt)
        return "Session"


def customer(request: Request) -> User:
    """Joriy mijoz (IsCustomer ruxsati bor view'larda) — tiplangan."""
    user = request.user
    if not isinstance(user, User):
        raise NotAuthenticated()
    return user


class IsCustomer(BasePermission):
    def has_permission(self, request: Request, view: Any) -> bool:
        return isinstance(request.user, User)
