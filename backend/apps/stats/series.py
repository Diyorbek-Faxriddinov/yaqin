"""Statistika qatorlari (kontraktdagi StatsSeries) — kunlik agregat jadvalidan, Toshkent sanasi.

Davr — oxirgi N kun, bugun bilan; hodisasiz kunlar ham qatorda (nol bilan) bo'ladi.
"""

from datetime import date, datetime, time, timedelta
from typing import Any

from django.db.models import QuerySet, Sum
from django.utils import timezone
from rest_framework.request import Request

from apps.businesses.models import Business
from apps.core.api import invalid
from apps.core.schedule import TASHKENT
from apps.stats.models import DailyStats

ALLOWED_DAYS = (7, 30, 90)
# Kontrakt maydoni → jadval ustuni
FIELDS = {
    "profileViews": "profile_views",
    "calls": "calls",
    "telegramClicks": "telegram_clicks",
    "directionClicks": "direction_clicks",
}


def days_param(request: Request) -> int:
    raw = request.query_params.get("days")
    if raw is None:
        return 30
    if raw not in {str(d) for d in ALLOWED_DAYS}:
        raise invalid({"days": ["7, 30 yoki 90"]})
    return int(raw)


def today() -> date:
    return timezone.now().astimezone(TASHKENT).date()


def period(days: int) -> tuple[date, date]:
    end = today()
    return end - timedelta(days=days - 1), end


def period_start(days: int) -> datetime:
    """Davr boshi — birinchi kun, Toshkent vaqti bilan 00:00."""
    return datetime.combine(period(days)[0], time.min, tzinfo=TASHKENT)


def _sums() -> dict[str, Any]:
    return {key: Sum(column) for key, column in FIELDS.items()}


def _totals(row: dict[str, Any] | None) -> dict[str, int]:
    return {key: int((row or {}).get(key) or 0) for key in FIELDS}


def stats_series(businesses: QuerySet[Business], days: int) -> dict[str, Any]:
    start, end = period(days)
    rows = (
        DailyStats.objects.filter(business__in=businesses, date__range=(start, end))
        .values("date")
        .annotate(**_sums())
    )
    by_date = {row["date"]: _totals(row) for row in rows}
    daily = []
    totals = dict.fromkeys(FIELDS, 0)
    for offset in range(days):
        day = start + timedelta(days=offset)
        counts = by_date.get(day, dict.fromkeys(FIELDS, 0))
        for key, value in counts.items():
            totals[key] += value
        daily.append({"date": day.isoformat(), **counts})
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "days": days,
        "totals": totals,
        "daily": daily,
    }


def top_businesses(
    businesses: QuerySet[Business], days: int, limit: int = 10
) -> list[dict[str, Any]]:
    """Davrda eng ko'p ko'rilganlar (faqat faollik bo'lganlar)."""
    start, end = period(days)
    rows = (
        DailyStats.objects.filter(business__in=businesses, date__range=(start, end))
        .values("business_id")
        .annotate(**_sums())
        .order_by("-profileViews", "business_id")[:limit]
    )
    names = {
        b.id: b
        for b in Business.objects.filter(pk__in=[r["business_id"] for r in rows]).only(
            "slug", "name"
        )
    }
    return [
        {
            "business": {
                "id": str(row["business_id"]),
                "slug": names[row["business_id"]].slug,
                "name": names[row["business_id"]].name,
            },
            "profileViews": int(row["profileViews"] or 0),
            "contactClicks": int(
                (row["calls"] or 0) + (row["telegramClicks"] or 0) + (row["directionClicks"] or 0)
            ),
        }
        for row in rows
    ]
