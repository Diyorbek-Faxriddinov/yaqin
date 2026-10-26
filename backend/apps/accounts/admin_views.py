"""Admin API: mijozlar — ko'rish (user.view) va bloklash (user.manage).

Kontakt maʼlumotlari umuman saqlanmaydi; ro'yxatda faqat ism, kirish usuli va faollik soni.
"""

from typing import Any
from uuid import UUID

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response

from apps.accounts.models import User
from apps.accounts.sessions import end_all_sessions
from apps.core.api import invalid, not_found, page_payload
from apps.staff.audit import audit
from apps.staff.authentication import AdminView, current_admin
from apps.staff.models import AuditEntry
from apps.staff.permissions import Permission


def admin_user(user: Any) -> dict[str, Any]:
    return {
        "id": str(user.id),
        "displayName": user.display_name,
        "provider": user.provider,
        "createdAt": user.created_at.isoformat(),
        "isBlocked": user.is_blocked,
        "blockedReason": user.blocked_reason or None,
        "reviewsCount": user.reviews_count,
        "complaintsCount": user.complaints_count,
    }


def with_counts(users: Any) -> Any:
    return users.annotate(
        reviews_count=Count("reviews", distinct=True),
        complaints_count=Count("complaints", distinct=True),
    )


class AdminUserListView(AdminView):
    admin_permission = Permission.USER_VIEW

    def get(self, request: Request) -> Response:
        users = User.objects.all()
        q = request.query_params.get("q", "").strip()[:100]
        if q:
            users = users.filter(Q(display_name__icontains=q))
        blocked = request.query_params.get("blocked")
        if blocked is not None:
            if blocked not in ("true", "false"):
                raise invalid({"blocked": ["true yoki false"]})
            users = users.filter(is_blocked=blocked == "true")
        users = with_counts(users).order_by("-created_at", "id")
        return Response(page_payload(users, request, admin_user))


class AdminUserDetailView(AdminView):
    admin_permission = Permission.USER_MANAGE

    def patch(self, request: Request, user_id: UUID) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        blocked = body.get("isBlocked")
        if not isinstance(blocked, bool):
            raise invalid({"isBlocked": ["Holat kerak"]})
        reason = body.get("blockedReason")
        reason = reason.strip() if isinstance(reason, str) else ""
        if blocked and not 3 <= len(reason) <= 200:
            raise invalid({"blockedReason": ["3–200 belgi"]})
        admin = current_admin(request)

        with transaction.atomic():
            user = User.objects.select_for_update().filter(pk=user_id).first()
            if user is None:
                raise not_found()
            if blocked:
                user.is_blocked, user.blocked_reason = True, reason
                user.blocked_at = timezone.now()
                # Faol sessiyalar darhol tugatiladi; mavjud sharhlari o'zgarmaydi
                end_all_sessions(user)
                summary, action = f"{user.display_name}: {reason}", "user.block"
            else:
                user.is_blocked, user.blocked_reason, user.blocked_at = False, "", None
                summary, action = user.display_name, "user.unblock"
            user.save(update_fields=["is_blocked", "blocked_reason", "blocked_at"])
            audit(admin, action, AuditEntry.TargetType.USER, user.id, summary)
        return Response(admin_user(with_counts(User.objects.filter(pk=user.pk)).get()))
