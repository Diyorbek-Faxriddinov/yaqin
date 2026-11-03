"""Admin API: biznes egalari, taklif havolalari va egalar takliflarini ko'rib chiqish (ADR-0015)."""

import secrets
from datetime import timedelta
from typing import Any
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response

from apps.accounts.sessions import hash_token
from apps.businesses.admin_input import text
from apps.businesses.admin_views import body_of, get_business
from apps.cabinet import services
from apps.cabinet.models import (
    MAX_OWNERS,
    BusinessChange,
    BusinessMembership,
    ChangeUpload,
    OwnerInvite,
)
from apps.cabinet.views import private_image
from apps.core.api import ApiError, invalid, not_found, page_payload
from apps.staff.audit import audit
from apps.staff.authentication import AdminView, current_admin
from apps.staff.models import AuditEntry
from apps.staff.permissions import Permission

Target = AuditEntry.TargetType
INVITE_TTL = timedelta(days=7)


def invite_status(invite: OwnerInvite | None) -> dict[str, Any] | None:
    if invite is None or invite.expires_at <= timezone.now():
        return None
    return {
        "createdAt": invite.created_at.isoformat(),
        "expiresAt": invite.expires_at.isoformat(),
        "createdBy": invite.created_by.display_name if invite.created_by else None,
    }


def owner_payload(membership: BusinessMembership) -> dict[str, Any]:
    return {
        "membershipId": str(membership.id),
        "user": {"id": str(membership.user.id), "displayName": membership.user.display_name},
        "provider": membership.user.provider,
        "since": membership.created_at.isoformat(),
        "invitedBy": membership.invited_by.display_name if membership.invited_by else None,
    }


class AdminOwnersView(AdminView):
    admin_permission = Permission.BUSINESS_VIEW

    def get(self, request: Request, business_id: UUID) -> Response:
        business = get_business(business_id)
        members = BusinessMembership.objects.filter(business=business).select_related(
            "user", "invited_by"
        )
        invite = OwnerInvite.objects.select_related("created_by").filter(business=business).first()
        return Response(
            {
                "owners": [owner_payload(m) for m in members],
                "invite": invite_status(invite),
                "maxOwners": MAX_OWNERS,
            }
        )


class AdminOwnerInviteView(AdminView):
    admin_permission = Permission.BUSINESS_OWNERS

    def post(self, request: Request, business_id: UUID) -> Response:
        admin = current_admin(request)
        with transaction.atomic():
            business = get_business(business_id, lock=True)
            if BusinessMembership.objects.filter(business=business).count() >= MAX_OWNERS:
                raise ApiError(409, "owner_limit", f"Biznesda koʻpi bilan {MAX_OWNERS} ta ega")
            # ~256 bit; bazada faqat xeshi — eski havola shu bilan bekor bo'ladi
            token = secrets.token_urlsafe(32)
            OwnerInvite.objects.filter(business=business).delete()
            invite = OwnerInvite.objects.create(
                business=business,
                token_hash=hash_token(token),
                created_by=admin,
                expires_at=timezone.now() + INVITE_TTL,
            )
            audit(
                admin,
                "owner.invite",
                Target.MEMBERSHIP,
                business.id,
                f"Ega taklifi: {business.name}",
            )
        site = settings.ALLOWED_ORIGINS[0].rstrip("/")
        return Response(
            {"url": f"{site}/kabinet/qoshilish#{token}", "status": invite_status(invite)},
            status=201,
        )

    def delete(self, request: Request, business_id: UUID) -> Response:
        admin = current_admin(request)
        with transaction.atomic():
            business = get_business(business_id, lock=True)
            deleted, _ = OwnerInvite.objects.filter(business=business).delete()
            if not deleted:
                raise not_found()
            audit(
                admin,
                "owner.invite.revoke",
                Target.MEMBERSHIP,
                business.id,
                f"Ega taklifi bekor qilindi: {business.name}",
            )
        return Response(status=204)


class AdminOwnerDetailView(AdminView):
    admin_permission = Permission.BUSINESS_OWNERS

    def delete(self, request: Request, business_id: UUID, membership_id: UUID) -> Response:
        admin = current_admin(request)
        with transaction.atomic():
            business = get_business(business_id, lock=True)
            membership = (
                BusinessMembership.objects.filter(business=business)
                .select_related("user")
                .filter(pk=membership_id)
                .first()
            )
            if membership is None:
                raise not_found()
            services.withdraw_pending(business, membership.user)
            membership.delete()
            audit(
                admin,
                "owner.remove",
                Target.MEMBERSHIP,
                membership_id,
                f"{business.name}: egalik bekor qilindi (foydalanuvchi {membership.user_id})",
            )
        return Response(status=204)


# --- Takliflar ---


def list_payload(change: BusinessChange, request: Request) -> dict[str, Any]:
    item_name = change.payload.get("item", {}).get("name") if change.payload.get("item") else None
    if item_name is None and change.item is not None:
        item_name = change.item.name
    if item_name is None and change.before.get("item"):
        item_name = change.before["item"].get("name")
    return {
        "id": str(change.id),
        "kind": change.kind,
        "status": change.status,
        "business": {
            "id": str(change.business.id),
            "slug": change.business.slug,
            "name": change.business.name,
        },
        "author": {
            "id": str(change.author.id)
            if change.author
            else "00000000-0000-0000-0000-000000000000",
            "displayName": change.author.display_name
            if change.author
            else "Oʻchirilgan foydalanuvchi",
        },
        "itemName": item_name,
        "important": change.important,
        "conflict": services.has_conflict(change, request),
        "createdAt": change.created_at.isoformat(),
    }


def detail_payload(change: BusinessChange, request: Request) -> dict[str, Any]:
    return {
        **list_payload(change, request),
        "fields": services.change_fields(change, request),
        "reviewedAt": change.reviewed_at.isoformat() if change.reviewed_at else None,
        "reviewedBy": change.reviewed_by.display_name if change.reviewed_by else None,
        "rejectionReason": change.rejection_reason or None,
    }


def get_change(change_id: UUID) -> BusinessChange:
    change = (
        BusinessChange.objects.select_related("business", "author", "item", "reviewed_by")
        .filter(pk=change_id)
        .first()
    )
    if change is None:
        raise not_found()
    return change


class ChangeAdminView(AdminView):
    admin_permission = Permission.CHANGE_REVIEW


class AdminChangeListView(ChangeAdminView):
    def get(self, request: Request) -> Response:
        changes = BusinessChange.objects.select_related("business", "author", "item")
        status = request.query_params.get("status")
        if status is not None:
            if status not in BusinessChange.Status.values:
                raise invalid({"status": ["Holat notoʻgʻri"]})
            changes = changes.filter(status=status)
        business_id = request.query_params.get("businessId")
        if business_id is not None:
            if not services._is_uuid(business_id):
                raise invalid({"businessId": ["ID notoʻgʻri"]})
            changes = changes.filter(business_id=business_id)
        # Navbat — eng eskisi birinchi; tarix — eng yangisi birinchi
        order = "created_at" if status == BusinessChange.Status.PENDING else "-created_at"
        changes = changes.order_by(order, "id")
        return Response(page_payload(changes, request, lambda c: list_payload(c, request)))


class AdminChangeDetailView(ChangeAdminView):
    def get(self, request: Request, change_id: UUID) -> Response:
        return Response(detail_payload(get_change(change_id), request))


class AdminChangeApproveView(ChangeAdminView):
    def post(self, request: Request, change_id: UUID) -> Response:
        change = get_change(change_id)
        services.approve(change, current_admin(request))
        return Response(detail_payload(get_change(change_id), request))


class AdminChangeRejectView(ChangeAdminView):
    def post(self, request: Request, change_id: UUID) -> Response:
        change = get_change(change_id)
        reason = text(body_of(request).get("reason"))
        if not 3 <= len(reason) <= 200:
            raise invalid({"reason": ["Sababini yozing (3–200 belgi)"]})
        services.reject(change, current_admin(request), reason)
        return Response(detail_payload(get_change(change_id), request))


class AdminChangeUploadView(ChangeAdminView):
    def get(self, request: Request, change_id: UUID, upload_id: UUID) -> HttpResponse:
        change = get_change(change_id)
        upload = ChangeUpload.objects.filter(change=change, pk=upload_id).first()
        if upload is None:
            raise not_found()
        return private_image(upload)
