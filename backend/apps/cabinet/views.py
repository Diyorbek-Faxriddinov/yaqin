"""Biznes kabineti API (ADR-0015) — mijoz sessiyasi bilan, faqat o'z bizneslari.

A'zo bo'lmagan biznes — 404 (mavjudligi oshkor qilinmaydi). Egalar faqat taklif qiladi: biznes
moderator tasdiqlaganda o'zgaradi (services.py).
"""

from typing import Any
from uuid import UUID

from django.core.files.base import ContentFile
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.authentication import customer
from apps.accounts.models import User
from apps.accounts.sessions import hash_token
from apps.businesses import public
from apps.businesses.admin_views import admin_business, admin_item
from apps.businesses.models import Business
from apps.businesses.photos import process_photo
from apps.businesses.tags import tag_suggestions
from apps.cabinet import services
from apps.cabinet.models import (
    MAX_OWNERS,
    BusinessChange,
    BusinessMembership,
    ChangeUpload,
    OwnerInvite,
)
from apps.catalog.views import category_ref, district_ref
from apps.community.views import CustomerView
from apps.core.api import ApiError, Lang, invalid, lang_of, not_found
from apps.staff.audit import audit
from apps.staff.models import AuditEntry
from apps.stats.series import days_param, stats_series

MAX_OWN_CHANGES_LISTED = 50
OWNER_FIELDS = (
    "id",
    "slug",
    "name",
    "description",
    "category",
    "district",
    "address",
    "location",
    "phones",
    "telegram",
    "instagram",
    "website",
    "amenities",
    "schedule",
    "status",
    "photos",
    "updatedAt",
)


def owned_business(business: Business, lang: Lang, request: Request) -> dict[str, Any]:
    membership = getattr(business, "membership_since", None)
    cover = business.photos.first()
    return {
        "id": str(business.id),
        "slug": business.slug,
        "name": business.name,
        "status": business.status,
        "category": category_ref(business.category, lang),
        "district": district_ref(business.district, lang),
        "cover": public.image(cover, request) if cover else None,
        "pendingChanges": BusinessChange.objects.filter(
            business=business, status=BusinessChange.Status.PENDING
        ).count(),
        "ownerSince": (membership or business.created_at).isoformat(),
    }


def owner_business(business: Business, lang: Lang, request: Request) -> dict[str, Any]:
    full = admin_business(business, lang, request)
    return {
        **{key: full[key] for key in OWNER_FIELDS},
        "items": [admin_item(entry, lang, request) for entry in public.items_queryset(business)],
    }


def owner_change(change: BusinessChange, user: User) -> dict[str, Any]:
    return {
        "id": str(change.id),
        # Bir biznesda bir nechta ega: qaytarib olish faqat o'z taklifida
        "mine": change.author_id == user.id,
        "kind": change.kind,
        "status": change.status,
        "itemId": str(change.item_id) if change.item_id else None,
        "fields": list(change.fields),
        "createdAt": change.created_at.isoformat(),
        "reviewedAt": change.reviewed_at.isoformat() if change.reviewed_at else None,
        "rejectionReason": change.rejection_reason or None,
    }


def pending_upload(upload: ChangeUpload) -> dict[str, Any]:
    return {
        "id": str(upload.id),
        "previewUrl": f"/api/v1/cabinet/businesses/{upload.business_id}/uploads/{upload.id}",
        "width": upload.width,
        "height": upload.height,
        "expiresAt": (upload.created_at + services.UPLOAD_TTL).isoformat(),
    }


def private_image(upload: ChangeUpload) -> HttpResponse:
    with upload.file.open("rb") as handle:
        response = HttpResponse(handle.read(), content_type="image/webp")
    response["Cache-Control"] = "private, no-store"
    return response


def owned(request: Request, business_id: UUID) -> Business:
    """Joriy foydalanuvchi egasi bo'lgan biznes — aks holda 404."""
    membership = (
        BusinessMembership.objects.select_related(
            "business", "business__category", "business__category__parent", "business__district"
        )
        .filter(user=customer(request), business_id=business_id)
        .first()
    )
    if membership is None:
        raise not_found()
    business = membership.business
    business.membership_since = membership.created_at  # type: ignore[attr-defined]
    return business


class InviteAcceptView(CustomerView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "owner_invites"

    def post(self, request: Request) -> Response:
        user = customer(request)
        token = request.data.get("token") if isinstance(request.data, dict) else None
        if not isinstance(token, str) or not 32 <= len(token) <= 64:
            raise invalid({"token": ["Havola notoʻgʻri"]})
        lang = lang_of(request)
        with transaction.atomic():
            invite = (
                OwnerInvite.objects.select_for_update()
                .select_related("business")
                .filter(token_hash=hash_token(token), expires_at__gt=timezone.now())
                .first()
            )
            if invite is None:
                raise not_found()
            business = invite.business
            # Takroriy bosish xato emas — taklif sarflanmaydi
            if BusinessMembership.objects.filter(user=user, business=business).exists():
                return Response(owned_business(owned(request, business.id), lang, request))
            if BusinessMembership.objects.filter(business=business).count() >= MAX_OWNERS:
                raise ApiError(409, "owner_limit", f"Biznesda koʻpi bilan {MAX_OWNERS} ta ega")
            try:
                membership = BusinessMembership.objects.create(
                    user=user, business=business, invited_by=invite.created_by
                )
            except IntegrityError:
                raise ApiError(409, "owner_exists", "Siz allaqachon egasiz") from None
            invite.delete()
            audit(
                None,
                "membership.accept",
                AuditEntry.TargetType.MEMBERSHIP,
                membership.id,
                f"{business.name}: yangi ega (foydalanuvchi {user.id})",
            )
        return Response(owned_business(owned(request, business.id), lang, request))


class OwnedBusinessListView(CustomerView):
    def get(self, request: Request) -> Response:
        lang = lang_of(request)
        memberships = (
            BusinessMembership.objects.select_related(
                "business", "business__category", "business__category__parent", "business__district"
            )
            .filter(user=customer(request))
            .order_by("created_at")
        )
        result = []
        for membership in memberships:
            business = membership.business
            business.membership_since = membership.created_at  # type: ignore[attr-defined]
            result.append(owned_business(business, lang, request))
        return Response(result)


class OwnedBusinessView(CustomerView):
    def get(self, request: Request, business_id: UUID) -> Response:
        return Response(owner_business(owned(request, business_id), lang_of(request), request))


class MembershipView(CustomerView):
    def delete(self, request: Request, business_id: UUID) -> Response:
        business = owned(request, business_id)
        user = customer(request)
        with transaction.atomic():
            membership = BusinessMembership.objects.get(user=user, business=business)
            services.withdraw_pending(business, user)
            membership.delete()
            audit(
                None,
                "membership.leave",
                AuditEntry.TargetType.MEMBERSHIP,
                membership.id,
                f"{business.name}: ega chiqdi (foydalanuvchi {user.id})",
            )
        return Response(status=204)


class OwnedBusinessStatsView(CustomerView):
    def get(self, request: Request, business_id: UUID) -> Response:
        days = days_param(request)
        business = owned(request, business_id)
        return Response(stats_series(Business.objects.filter(pk=business.pk), days))


class OwnedTagSuggestionsView(CustomerView):
    def get(self, request: Request, business_id: UUID) -> Response:
        return Response({"tags": tag_suggestions(owned(request, business_id))})


class UploadListView(CustomerView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "owner_uploads"

    def post(self, request: Request, business_id: UUID) -> Response:
        business = owned(request, business_id)
        upload = request.FILES.get("file")
        if upload is None:
            raise invalid({"file": ["Rasm tanlang"]})
        recent = ChangeUpload.objects.filter(
            business=business, created_at__gt=timezone.now() - services.UPLOAD_TTL
        )
        if (
            recent.filter(
                Q(change__isnull=True) | Q(change__status=BusinessChange.Status.PENDING)
            ).count()
            >= services.MAX_PENDING_UPLOADS
        ):
            raise ApiError(
                409,
                "too_many_uploads",
                f"Tasdiqlanmagan rasmlar koʻp ({services.MAX_PENDING_UPLOADS})",
            )
        processed = process_photo(upload)
        entry = ChangeUpload(
            business=business,
            uploaded_by=customer(request),
            width=processed.width,
            height=processed.height,
        )
        entry.file.save("photo.webp", ContentFile(processed.content), save=False)
        entry.save()
        return Response(pending_upload(entry), status=201)


class UploadDetailView(CustomerView):
    def get(self, request: Request, business_id: UUID, upload_id: UUID) -> HttpResponse:
        business = owned(request, business_id)
        upload = ChangeUpload.objects.filter(business=business, pk=upload_id).first()
        if upload is None:
            raise not_found()
        return private_image(upload)


class ChangeListView(CustomerView):
    throttle_scope = "owner_changes"

    def get_throttles(self) -> list[Any]:
        # Faqat yuborish cheklanadi (kuniga), ro'yxatni ko'rish emas
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    def get(self, request: Request, business_id: UUID) -> Response:
        business = owned(request, business_id)
        changes = BusinessChange.objects.filter(business=business).order_by("-created_at")
        user = customer(request)
        return Response([owner_change(c, user) for c in changes[:MAX_OWN_CHANGES_LISTED]])

    def post(self, request: Request, business_id: UUID) -> Response:
        business = owned(request, business_id)
        body = request.data if isinstance(request.data, dict) else {}
        change = services.propose(business, customer(request), body)
        return Response(owner_change(change, customer(request)), status=201)


class ChangeWithdrawView(CustomerView):
    def post(self, request: Request, business_id: UUID, change_id: UUID) -> Response:
        business = owned(request, business_id)
        change = BusinessChange.objects.filter(
            business=business, author=customer(request), pk=change_id
        ).first()
        if change is None:
            raise not_found()
        services.withdraw(change)
        return Response(owner_change(change, customer(request)))
