"""Ommaviy (e'lon qilingan) bizneslar: so'rovlar va kontraktdagi javob shakllari.

Xatti-harakat frontend mock'i (`frontend/src/mocks/db.ts`) bilan bir xil: filtrlar,
"tavsiya etilgan" saralash formulasi, "hozir ochiq" (yopilishiga oz qolganlar ham ochiq).
"""

from datetime import datetime
from typing import Any

from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.db.models import (
    Case,
    F,
    FloatField,
    Max,
    Min,
    OuterRef,
    Prefetch,
    Q,
    QuerySet,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Cast, Coalesce, Ln
from rest_framework import serializers
from rest_framework.request import Request

from apps.businesses.models import Business, BusinessPhoto, Item
from apps.catalog.views import category_ref, district_ref
from apps.core.api import Lang, money
from apps.core.schedule import is_open_now
from apps.core.text import normalize_for_search

SORTS = ("recommended", "rating", "distance", "newest")


class ListParams(serializers.Serializer[dict[str, Any]]):
    q = serializers.CharField(
        max_length=100, required=False, allow_blank=True, trim_whitespace=True
    )
    category = serializers.CharField(required=False, allow_blank=True)
    district = serializers.CharField(required=False, allow_blank=True)
    openNow = serializers.BooleanField(required=False, default=False)
    lat = serializers.FloatField(min_value=-90, max_value=90, required=False)
    lng = serializers.FloatField(min_value=-180, max_value=180, required=False)
    sort = serializers.ChoiceField(choices=SORTS, default="recommended")

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        if ("lat" in attrs) != ("lng" in attrs):
            raise serializers.ValidationError(
                {"lat": "lat va lng birga va toʻgʻri koordinata boʻlishi kerak"}
            )
        if attrs.get("sort") == "distance" and "lat" not in attrs:
            raise serializers.ValidationError(
                {"sort": "Masofa boʻyicha saralash uchun joylashuv kerak"}
            )
        return attrs


def origin_of(params: dict[str, Any]) -> Point | None:
    if "lat" not in params:
        return None
    return Point(params["lng"], params["lat"], srid=4326)


def _price_subquery(expression: Any, aggregate: type) -> Subquery:
    # Katalogdagi narxlardan oraliq — har bir biznes uchun alohida (qatorlar ko'paymasligi uchun)
    return Subquery(
        Item.objects.filter(business=OuterRef("pk"))
        .order_by()
        .values("business")
        .annotate(value=aggregate(expression))
        .values("value")
    )


def published() -> QuerySet[Business]:
    return (
        Business.objects.filter(status=Business.Status.PUBLISHED)
        .select_related("category", "category__parent", "district")
        .prefetch_related(Prefetch("photos", queryset=BusinessPhoto.objects.all()))
        .annotate(
            price_low=_price_subquery(F("price_min"), Min),
            price_high=_price_subquery(Coalesce("price_max", "price_min"), Max),
        )
    )


def _query_filter(q: str) -> Q:
    """Har bir so'z mos kelishi kerak: aniq qism yoki (imlo xatosi uchun) trigram o'xshashlik.

    5+ harfli so'zlarning oxirgi harfi hisobga olinmaydi — qo'shimcha farqlari
    ("аптека" ↔ "Аптеки"), frontend mock bilan bir xil.
    """
    condition = Q()
    for token in normalize_for_search(q).split():
        stem = token[:-1] if len(token) >= 5 else token
        condition &= Q(search_text__icontains=stem) | Q(search_text__trigram_word_similar=token)
    return condition


def apply_filters(
    queryset: QuerySet[Business], params: dict[str, Any], now: datetime
) -> QuerySet[Business]:
    if params.get("category"):
        slug = params["category"]
        queryset = queryset.filter(Q(category__slug=slug) | Q(category__parent__slug=slug))
    if params.get("district"):
        queryset = queryset.filter(district__slug=params["district"])
    if params.get("q"):
        queryset = queryset.filter(_query_filter(params["q"]))
    if params.get("openNow"):
        # Ish vaqti JSON'da — Python'da hisoblanadi (Toshkent miqyosida yetarlicha tez)
        schedules = queryset.values_list("id", "schedule")
        open_ids = [pk for pk, schedule in schedules if is_open_now(schedule, now)]
        queryset = queryset.filter(id__in=open_ids)
    return queryset


def apply_sort(queryset: QuerySet[Business], sort: str, origin: Point | None) -> QuerySet[Business]:
    if origin is not None:
        queryset = queryset.annotate(distance=Distance("location", origin))
    average = Case(
        When(rating_count=0, then=Value(None, output_field=FloatField())),
        default=Cast("rating_sum", FloatField()) / Cast("rating_count", FloatField()),
    )
    queryset = queryset.annotate(average=average)
    if sort == "distance":
        return queryset.order_by("distance", "id")
    if sort == "rating":
        return queryset.order_by(F("average").desc(nulls_last=True), "-rating_count", "id")
    if sort == "newest":
        return queryset.order_by("-created_at", "id")
    # Tavsiya etilgan: reyting × ishonch (sharhlar soni) + joyida tekshirilganlik
    score = Coalesce(F("average"), Value(3.0)) * Ln(F("rating_count") + 10) / Ln(
        Value(10.0)
    ) + Case(When(is_verified=True, then=Value(0.5)), default=Value(0.0), output_field=FloatField())
    return queryset.annotate(score=score).order_by("-score", "-created_at", "id")


def image(photo: BusinessPhoto, request: Request) -> dict[str, Any]:
    # Saytga nisbatan yo'l (`/api/v1/media/...`): brauzer uni sayt manzili orqali oladi (reverse
    # proxy → Django yoki veb-server), frontend rasm optimizatori — o'zining /api/v1 yo'li orqali
    return {
        "url": photo.file.url,
        "width": photo.width,
        "height": photo.height,
        "alt": photo.alt or None,
    }


def rating(business: Business) -> dict[str, Any]:
    return {"average": business.rating_average, "count": business.rating_count}


def location(business: Business) -> dict[str, float]:
    if business.location is None:  # e'lon qilingan biznesda DB cheklovi buni istisno qiladi
        raise ValueError(f"Joylashuvsiz biznes: {business.slug}")
    return {"lat": business.location.y, "lng": business.location.x}


def summary(business: Business, lang: Lang, request: Request) -> dict[str, Any]:
    photos = list(business.photos.all())
    low = getattr(business, "price_low", None)
    high = getattr(business, "price_high", None)
    distance = getattr(business, "distance", None)
    return {
        "id": str(business.id),
        "slug": business.slug,
        "name": business.name,
        "category": category_ref(business.category, lang),
        "district": district_ref(business.district, lang),
        "location": location(business),
        "coverImage": image(photos[0], request) if photos else None,
        "rating": rating(business),
        "priceRange": {"min": money(low), "max": money(high)} if low is not None else None,
        "schedule": business.schedule,
        "distanceMeters": round(distance.m) if distance is not None else None,
        "isVerified": business.is_verified,
        "createdAt": business.created_at.isoformat(),
    }


def detail(business: Business, lang: Lang, request: Request) -> dict[str, Any]:
    return {
        **summary(business, lang, request),
        "description": business.description or None,
        "address": {"text": business.address_text, "landmark": business.address_landmark or None},
        "phones": [
            {"number": phone["number"], "label": phone.get("label") or None}
            for phone in business.phones
        ],
        "telegram": business.telegram or None,
        "instagram": business.instagram or None,
        "website": business.website or None,
        "gallery": [image(photo, request) for photo in business.photos.all()],
    }


def marker(business: Business, lang: Lang) -> dict[str, Any]:
    return {
        "id": str(business.id),
        "slug": business.slug,
        "name": business.name,
        "location": location(business),
        "category": category_ref(business.category, lang),
        "rating": rating(business),
        "schedule": business.schedule,
    }


def item(entry: Item) -> dict[str, Any]:
    return {
        "id": str(entry.id),
        "slug": entry.slug,
        "kind": entry.kind,
        "name": entry.name,
        "group": entry.group or None,
        "description": entry.description or None,
        "price": {
            "type": entry.price_type,
            "min": money(entry.price_min),
            "max": money(entry.price_max),
        },
        "durationMinutes": entry.duration_minutes,
        "attributes": [
            {"key": a["key"], "name": a["name"], "value": a["value"]} for a in entry.attributes
        ],
        # Mahsulot rasmlari MVP'da yo'q (docs/backend-data-model.md)
        "images": [],
        "isAvailable": entry.is_available,
    }
