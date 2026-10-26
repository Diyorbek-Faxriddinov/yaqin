"""Admin API: platforma va biznes statistikasi, egasi uchun hisobot havolasi (ADR-0007)."""

import secrets
from typing import Any
from uuid import UUID

from django.db import transaction
from rest_framework.request import Request
from rest_framework.response import Response

from apps.accounts.sessions import hash_token
from apps.businesses.models import Business, BusinessRequest
from apps.community.models import Complaint, Review
from apps.core.api import not_found
from apps.staff.audit import audit
from apps.staff.authentication import AdminView, current_admin
from apps.staff.models import AuditEntry
from apps.staff.permissions import Permission
from apps.stats.models import ReportLink
from apps.stats.series import days_param, period_start, stats_series, top_businesses

Target = AuditEntry.TargetType


def link_status(link: ReportLink | None) -> dict[str, Any]:
    if link is None:
        return {"active": False, "createdAt": None, "lastViewedAt": None, "viewCount": 0}
    return {
        "active": True,
        "createdAt": link.created_at.isoformat(),
        "lastViewedAt": link.last_viewed_at.isoformat() if link.last_viewed_at else None,
        "viewCount": link.view_count,
    }


def get_business(business_id: UUID) -> Business:
    business = Business.objects.filter(pk=business_id).first()
    if business is None:
        raise not_found()
    return business


class AdminStatsView(AdminView):
    admin_permission = Permission.STATS_VIEW

    def get(self, request: Request) -> Response:
        days = days_param(request)
        published = Business.objects.filter(status=Business.Status.PUBLISHED)
        since = period_start(days)
        return Response(
            {
                **stats_series(published, days),
                "topBusinesses": top_businesses(published, days),
                "content": {
                    "publishedBusinesses": published.count(),
                    "newBusinesses": Business.objects.filter(created_at__gte=since).count(),
                    "newReviews": Review.objects.filter(created_at__gte=since).count(),
                    "newComplaints": Complaint.objects.filter(created_at__gte=since).count(),
                    "newRequests": BusinessRequest.objects.filter(created_at__gte=since).count(),
                },
            }
        )


class AdminBusinessStatsView(AdminView):
    admin_permission = Permission.BUSINESS_VIEW

    def get(self, request: Request, business_id: UUID) -> Response:
        days = days_param(request)
        business = get_business(business_id)
        return Response(stats_series(Business.objects.filter(pk=business.pk), days))


class AdminReportLinkView(AdminView):
    admin_permission: str | None = Permission.BUSINESS_VIEW
    admin_permissions = {"POST": Permission.BUSINESS_EDIT, "DELETE": Permission.BUSINESS_EDIT}

    def get(self, request: Request, business_id: UUID) -> Response:
        business = get_business(business_id)
        return Response(link_status(ReportLink.objects.filter(business=business).first()))

    def post(self, request: Request, business_id: UUID) -> Response:
        business = get_business(business_id)
        admin = current_admin(request)
        # ~256 bit tasodifiylik; saqlanadi faqat xeshi — eski havola shu bilan bekor bo'ladi
        token = secrets.token_urlsafe(32)
        with transaction.atomic():
            ReportLink.objects.filter(business=business).delete()
            link = ReportLink.objects.create(business=business, token_hash=hash_token(token))
            audit(
                admin,
                "report.create",
                Target.REPORT,
                business.id,
                f"Hisobot havolasi: {business.name}",
            )
        return Response({"token": token, "status": link_status(link)}, status=201)

    def delete(self, request: Request, business_id: UUID) -> Response:
        business = get_business(business_id)
        admin = current_admin(request)
        with transaction.atomic():
            deleted, _ = ReportLink.objects.filter(business=business).delete()
            if not deleted:
                raise not_found()
            audit(
                admin,
                "report.revoke",
                Target.REPORT,
                business.id,
                f"Havola bekor qilindi: {business.name}",
            )
        return Response(status=204)
