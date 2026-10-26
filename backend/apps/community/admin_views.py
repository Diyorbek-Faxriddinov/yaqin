"""Admin API: sharhlar moderatsiyasi (review.moderate) va shikoyatlar (complaint.manage).

Navbatdagi yozuvlar eng eskisi birinchi — hech biri unutilib qolmasligi uchun; yopilganlari —
eng yangisi birinchi.
"""

from typing import Any
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response

from apps.businesses.models import Business
from apps.community.models import Complaint, Review
from apps.community.services import add_to_rating, remove_from_rating
from apps.core.api import invalid, not_found, page_payload
from apps.staff.audit import audit
from apps.staff.authentication import AdminView, current_admin
from apps.staff.models import AuditEntry
from apps.staff.permissions import Permission

DELETED_USER = "Oʻchirilgan foydalanuvchi"


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def required_note(value: Any, field: str, low: int, high: int) -> str:
    note = text(value)
    if not low <= len(note) <= high:
        raise invalid({field: [f"{low}–{high} belgi"]})
    return note


def business_ref(business: Business) -> dict[str, Any]:
    return {"id": str(business.id), "slug": business.slug, "name": business.name}


def status_filter(request: Request, allowed: list[str]) -> str | None:
    status = request.query_params.get("status")
    if status is None:
        return None
    if status not in allowed:
        raise invalid({"status": ["Holat notoʻgʻri"]})
    return status


def admin_review(review: Review) -> dict[str, Any]:
    user = review.user
    return {
        "id": str(review.id),
        "business": business_ref(review.business),
        # Akkaunti o'chirilgan muallif — chop etilgan sharh muallifsiz qoladi
        "author": {"id": str(user.id), "displayName": user.display_name} if user else None,
        "rating": review.rating,
        "text": review.text or None,
        "status": review.status,
        "rejectionReason": review.rejection_reason or None,
        "createdAt": review.created_at.isoformat(),
        "moderatedAt": review.moderated_at.isoformat() if review.moderated_at else None,
    }


def admin_complaint(complaint: Complaint) -> dict[str, Any]:
    return {
        "id": str(complaint.id),
        "business": business_ref(complaint.business),
        "reporter": {"id": str(complaint.user.id), "displayName": complaint.user.display_name},
        "reason": complaint.reason,
        "text": complaint.text or None,
        "status": complaint.status,
        "resolutionNote": complaint.resolution_note or None,
        "createdAt": complaint.created_at.isoformat(),
        "updatedAt": complaint.updated_at.isoformat(),
    }


class AdminReviewListView(AdminView):
    admin_permission = Permission.REVIEW_MODERATE

    def get(self, request: Request) -> Response:
        status = status_filter(request, Review.Status.values)
        reviews = Review.objects.select_related("business", "user")
        if status:
            reviews = reviews.filter(status=status)
        order = "created_at" if status == Review.Status.PENDING else "-created_at"
        return Response(page_payload(reviews.order_by(order, "id"), request, admin_review))


class AdminReviewDetailView(AdminView):
    admin_permission = Permission.REVIEW_MODERATE

    def patch(self, request: Request, review_id: UUID) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        status = body.get("status")
        if status not in (Review.Status.PUBLISHED, Review.Status.REJECTED):
            raise invalid({"status": ["Holat notoʻgʻri"]})
        reason = ""
        if status == Review.Status.REJECTED:
            reason = required_note(body.get("rejectionReason"), "rejectionReason", 3, 200)
        admin = current_admin(request)

        with transaction.atomic():
            review = (
                Review.objects.select_for_update(of=("self",))
                .select_related("business", "user")
                .filter(pk=review_id)
                .first()
            )
            if review is None:
                raise not_found()
            was_published = review.status == Review.Status.PUBLISHED
            review.status, review.rejection_reason = status, reason
            review.moderated_at = timezone.now()
            review.save(update_fields=["status", "rejection_reason", "moderated_at"])
            # Reyting faqat chop etilganlik holati o'zgarganda (va kesh — shu bilan birga)
            if status == Review.Status.PUBLISHED and not was_published:
                add_to_rating(review)
            elif status == Review.Status.REJECTED and was_published:
                remove_from_rating(review)
            action = "review.publish" if status == Review.Status.PUBLISHED else "review.reject"
            audit(
                admin,
                action,
                AuditEntry.TargetType.REVIEW,
                review.id,
                f"{review.business.name}: {review.rating}★{f' — {reason}' if reason else ''}",
            )
        return Response(admin_review(review))


class AdminComplaintListView(AdminView):
    admin_permission = Permission.COMPLAINT_MANAGE

    def get(self, request: Request) -> Response:
        status = status_filter(request, Complaint.Status.values)
        complaints = Complaint.objects.select_related("business", "user")
        if status:
            complaints = complaints.filter(status=status)
        queue = status in (Complaint.Status.OPEN, Complaint.Status.IN_REVIEW)
        order = "created_at" if queue else "-created_at"
        return Response(page_payload(complaints.order_by(order, "id"), request, admin_complaint))


class AdminComplaintDetailView(AdminView):
    admin_permission = Permission.COMPLAINT_MANAGE

    def patch(self, request: Request, complaint_id: UUID) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        status = body.get("status")
        allowed = (Complaint.Status.IN_REVIEW, Complaint.Status.RESOLVED, Complaint.Status.REJECTED)
        if status not in allowed:
            raise invalid({"status": ["Holat notoʻgʻri"]})
        note = ""
        if status != Complaint.Status.IN_REVIEW:
            # Yuborgan foydalanuvchi javobni "Mening shikoyatlarim"da ko'radi
            note = required_note(body.get("resolutionNote"), "resolutionNote", 3, 500)
        admin = current_admin(request)

        with transaction.atomic():
            complaint = (
                Complaint.objects.select_for_update(of=("self",))
                .select_related("business", "user")
                .filter(pk=complaint_id)
                .first()
            )
            if complaint is None:
                raise not_found()
            complaint.status, complaint.resolution_note = status, note
            complaint.save(update_fields=["status", "resolution_note", "updated_at"])
            audit(
                admin,
                f"complaint.{status}",
                AuditEntry.TargetType.COMPLAINT,
                complaint.id,
                f"{complaint.business.name}: {note or 'koʻrib chiqilmoqda'}",
            )
        return Response(admin_complaint(complaint))
