"""DRF: admin sessiyasi + CSRF va ruxsatlar (ADR-0009).

View'da:
    authentication_classes = [AdminSessionAuthentication]
    permission_classes = [IsAdmin]
    admin_permission = "business.view"            # yoki "root", yoki None — faqat kirgan bo'lsa
    admin_permissions = {"PATCH": "business.edit"}  # ixtiyoriy: usul bo'yicha
Joriy administrator — `current_admin(request)`.
"""

from typing import Any

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from apps.accounts.authentication import SAFE_METHODS, check_csrf
from apps.core.api import ApiError
from apps.staff.models import AdminSession, AdminUser
from apps.staff.sessions import ADMIN_SESSION_COOKIE, find_admin_session

ROOT = "root"


def not_authenticated() -> ApiError:
    return ApiError(401, "not_authenticated", "Admin sifatida kiring")


class AdminSessionAuthentication(BaseAuthentication):
    def authenticate(self, request: Request) -> tuple[AdminUser, AdminSession] | None:
        session = find_admin_session(request.COOKIES.get(ADMIN_SESSION_COOKIE))
        if session is None:
            return None
        if request.method not in SAFE_METHODS:
            check_csrf(request, session.csrf_token)
        return session.admin, session

    def authenticate_header(self, request: Request) -> str:
        return "AdminSession"


def current_admin(request: Request) -> AdminUser:
    admin = request.user
    if not isinstance(admin, AdminUser):
        raise NotAuthenticated()
    return admin


class IsAdmin(BasePermission):
    def has_permission(self, request: Request, view: Any) -> bool:
        admin = request.user
        if not isinstance(admin, AdminUser):
            raise not_authenticated()
        by_method: dict[str, str | None] = getattr(view, "admin_permissions", {})
        required = by_method.get(request.method or "", getattr(view, "admin_permission", None))
        if required is None:
            return True
        if required == ROOT:
            if not admin.is_root:
                raise ApiError(403, "root_required", "Bu amal faqat Root uchun")
            return True
        if not admin.has_permission(required):
            raise ApiError(403, "permission_denied", "Bu amal uchun ruxsatingiz yoʻq")
        return True
