import re
from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.sessions import hash_token
from apps.businesses.models import Business
from apps.core.api import ApiError, lang_of
from apps.core.schedule import TASHKENT
from apps.stats.models import DailyStats, ReportLink
from apps.stats.series import stats_series

TOKEN = re.compile(r"^[A-Za-z0-9_-]{32,64}$")

# Kontraktdagi StatsEvent.type → kunlik ustun
EVENT_FIELDS = {
    "profile_view": "profile_views",
    "call_click": "calls",
    "telegram_click": "telegram_clicks",
    "direction_click": "direction_clicks",
}


class EventInput(serializers.Serializer[dict[str, Any]]):
    type = serializers.ChoiceField(choices=list(EVENT_FIELDS))
    businessId = serializers.UUIDField()

    def validate_businessId(self, value: Any) -> Any:
        if not Business.objects.filter(id=value, status=Business.Status.PUBLISHED).exists():
            raise serializers.ValidationError("Biznes topilmadi")
        return value


def record_event(business_id: Any, event_type: str) -> None:
    """Bugungi (Toshkent) hisoblagichni bittaga oshiradi — parallel so'rovlarda ham to'g'ri."""
    today = timezone.now().astimezone(TASHKENT).date()
    field = EVENT_FIELDS[event_type]
    updated = DailyStats.objects.filter(business_id=business_id, date=today).update(
        **{field: F(field) + 1}
    )
    if updated:
        return
    try:
        with transaction.atomic():
            DailyStats.objects.create(business_id=business_id, date=today, **{field: 1})
    except IntegrityError:
        # Boshqa so'rov shu orada yaratib qo'ydi
        DailyStats.objects.filter(business_id=business_id, date=today).update(
            **{field: F(field) + 1}
        )


class EventView(APIView):
    """Ko'rish va bosish hodisalari (shaxsiy maʼlumotsiz). IP bo'yicha cheklangan."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "events"

    def post(self, request: Request) -> Response:
        data = EventInput(data=request.data)
        data.is_valid(raise_exception=True)
        record_event(data.validated_data["businessId"], data.validated_data["type"])
        return Response(status=202)


class ReportView(APIView):
    """Biznes egasi uchun hisobot (maxfiy havola, kirish shart emas). Faqat sonlar — shaxsiy
    maʼlumotsiz. Noto'g'ri yoki bekor qilingan havola — 404; tanlab topishga qarshi IP cheklovi.
    """

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "reports"

    def get(self, request: Request, token: str) -> Response:
        link = None
        if TOKEN.fullmatch(token):
            link = (
                ReportLink.objects.select_related("business__category", "business__district")
                .filter(token_hash=hash_token(token))
                .first()
            )
        if link is None:
            raise ApiError(404, "not_found", "Havola topilmadi yoki bekor qilingan")
        ReportLink.objects.filter(pk=link.pk).update(
            view_count=F("view_count") + 1, last_viewed_at=timezone.now()
        )
        business, lang = link.business, lang_of(request)
        response = Response(
            {
                **stats_series(Business.objects.filter(pk=business.pk), 30),
                "business": {
                    "name": business.name,
                    "categoryName": business.category.name(lang),
                    "districtName": business.district.name(lang),
                    "isPublished": business.status == Business.Status.PUBLISHED,
                },
                "generatedAt": timezone.now().isoformat(),
            }
        )
        # Havola brauzer keshida, tarixda yoki Referer orqali boshqa saytga sizib chiqmasin
        response["Cache-Control"] = "no-store"
        response["Referrer-Policy"] = "no-referrer"
        return response
