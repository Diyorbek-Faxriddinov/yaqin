from typing import Any

from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.businesses.models import Business
from apps.core.schedule import TASHKENT
from apps.stats.models import DailyStats

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
