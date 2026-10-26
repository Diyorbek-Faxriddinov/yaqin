"""Ommaviy biznes endpointlari. Faqat e'lon qilingan bizneslar ko'rinadi."""

from typing import Any

from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle, ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import CustomerSessionAuthentication, IsCustomer
from apps.businesses import public
from apps.businesses.models import Business, BusinessRequest
from apps.catalog.models import Category, District
from apps.catalog.views import category_ref
from apps.community.models import Review
from apps.community.views import create_review
from apps.core.api import ApiError, Lang, lang_of, not_found, page_params, page_slice
from apps.core.models import PlatformSettings
from apps.core.phone import normalize_uz_phone
from apps.core.text import normalize_for_search

MAX_ITEMS = 300
MAX_MARKERS = 1000
SUGGEST_LIMIT = 5
DELETED_AUTHOR = {"uz": "Oʻchirilgan foydalanuvchi", "ru": "Удалённый пользователь"}


def get_published(slug: str) -> Business:
    business = public.published().filter(slug=slug).first()
    if business is None:
        raise not_found()
    return business


def public_author_name(display_name: str) -> str:
    """Ommaviy ism: "Malika Rahimova" → "Malika R." (to'liq ism ko'rsatilmaydi)."""
    first, *rest = display_name.split() or [""]
    return f"{first} {rest[0][0].upper()}." if rest else first


class BusinessListView(APIView):
    def get(self, request: Request) -> Response:
        params = public.ListParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        page, page_size = page_params(request)
        filters = params.validated_data
        origin = public.origin_of(filters)
        queryset = public.apply_filters(public.published(), filters, timezone.now())
        total = queryset.count()
        ordered = public.apply_sort(queryset, filters["sort"], origin)
        lang = lang_of(request)
        return Response(
            {
                "items": [
                    public.summary(b, lang, request) for b in page_slice(ordered, page, page_size)
                ],
                "total": total,
                "page": page,
                "pageSize": page_size,
            }
        )


class BusinessDetailView(APIView):
    def get(self, request: Request, slug: str) -> Response:
        return Response(public.detail(get_published(slug), lang_of(request), request))


class BusinessItemsView(APIView):
    def get(self, request: Request, slug: str) -> Response:
        business = get_published(slug)
        return Response([public.item(entry) for entry in business.items.all()[:MAX_ITEMS]])


class BusinessItemView(APIView):
    def get(self, request: Request, slug: str, item_slug: str) -> Response:
        entry = get_published(slug).items.filter(slug=item_slug).first()
        if entry is None:
            raise not_found()
        return Response(public.item(entry))


class BusinessReviewsView(APIView):
    """GET — ommaviy (chop etilgan sharhlar); POST — sharh qoldirish (kirish talab qilinadi)."""

    authentication_classes = [CustomerSessionAuthentication]

    def get_permissions(self) -> list[BasePermission]:
        return [IsCustomer()] if self.request.method == "POST" else []

    def get_throttles(self) -> list[BaseThrottle]:
        return [ScopedRateThrottle()] if self.request.method == "POST" else []

    throttle_scope = "reviews"

    def post(self, request: Request, slug: str) -> Response:
        return create_review(request, slug)

    def get(self, request: Request, slug: str) -> Response:
        business = get_published(slug)
        page, page_size = page_params(request)
        lang = lang_of(request)
        reviews = (
            Review.objects.filter(business=business, status=Review.Status.PUBLISHED)
            .select_related("user")
            .order_by("-created_at", "id")
        )
        return Response(
            {
                "items": [
                    {
                        "id": str(review.id),
                        "authorName": public_author_name(review.user.display_name)
                        if review.user
                        else DELETED_AUTHOR[lang],
                        "rating": review.rating,
                        "text": review.text or None,
                        "createdAt": review.created_at.isoformat(),
                        "reply": {
                            "text": review.reply_text,
                            "createdAt": review.reply_at.isoformat(),
                        }
                        if review.reply_text and review.reply_at
                        else None,
                    }
                    for review in page_slice(reviews, page, page_size)
                ],
                "total": reviews.count(),
                "page": page,
                "pageSize": page_size,
            }
        )


class MarkerParams(serializers.Serializer[dict[str, Any]]):
    category = serializers.CharField(required=False, allow_blank=True)
    district = serializers.CharField(required=False, allow_blank=True)
    openNow = serializers.BooleanField(required=False, default=False)


class MapMarkersView(APIView):
    def get(self, request: Request) -> Response:
        params = MarkerParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        queryset = public.apply_filters(public.published(), params.validated_data, timezone.now())
        ordered = public.apply_sort(queryset, "recommended", None)[:MAX_MARKERS]
        lang = lang_of(request)
        return Response([public.marker(b, lang) for b in ordered])


class SuggestParams(serializers.Serializer[dict[str, str]]):
    q = serializers.CharField(min_length=2, max_length=100, trim_whitespace=True)


def _matches_name(name: str, tokens: list[str]) -> bool:
    text = normalize_for_search(name)
    return all((token[:-1] if len(token) >= 5 else token) in text for token in tokens)


class SuggestView(APIView):
    """Qidiruv takliflari: mos kategoriyalar va nomi mos bizneslar (har biridan 5 tagacha)."""

    def get(self, request: Request) -> Response:
        params = SuggestParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        query = normalize_for_search(params.validated_data["q"])
        tokens = query.split()
        lang: Lang = lang_of(request)

        categories = [
            category_ref(category, lang)
            for category in Category.objects.select_related("parent")
            if query in normalize_for_search(category.name_uz)
            or query in normalize_for_search(category.name_ru)
        ][:SUGGEST_LIMIT]

        candidates = public.apply_filters(public.published(), {"q": query}, timezone.now())
        businesses = [
            {"slug": b.slug, "name": b.name, "categoryName": b.category.name(lang)}
            for b in public.apply_sort(candidates, "recommended", None)[:50]
            if _matches_name(b.name, tokens)
        ][:SUGGEST_LIMIT]
        return Response({"categories": categories, "businesses": businesses})


class BusinessRequestInput(serializers.Serializer[dict[str, Any]]):
    businessName = serializers.CharField(min_length=2, max_length=120)
    activity = serializers.CharField(
        max_length=100, required=False, allow_blank=True, allow_null=True
    )
    districtSlug = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address = serializers.CharField(
        max_length=300, required=False, allow_blank=True, allow_null=True
    )
    contactName = serializers.CharField(min_length=2, max_length=60)
    phone = serializers.CharField(max_length=32)
    note = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)
    agree = serializers.BooleanField()

    def validate_phone(self, value: str) -> str:
        phone = normalize_uz_phone(value)
        if phone is None:
            raise serializers.ValidationError("Raqam formati: +998XXXXXXXXX")
        return phone

    def validate_agree(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError("Shaxsiy maʼlumotlarni qayta ishlashga rozilik kerak")
        return value

    def validate_districtSlug(self, value: str | None) -> District | None:
        if not value:
            return None
        district = District.objects.filter(slug=value).first()
        if district is None:
            raise serializers.ValidationError("Tuman topilmadi")
        return district


class BusinessRequestCreateView(APIView):
    """“Biznesingizni qo'shing” — kirish shart emas, IP bo'yicha cheklangan (handoff, 2-bo'lim)."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "business_requests"

    def post(self, request: Request) -> Response:
        if not PlatformSettings.load().business_requests_open:
            raise ApiError(403, "requests_closed", "Hozircha soʻrovlar qabul qilinmayapti")
        data = BusinessRequestInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        created = BusinessRequest.objects.create(
            business_name=values["businessName"],
            activity=values.get("activity") or "",
            district=values.get("districtSlug"),
            address=values.get("address") or "",
            contact_name=values["contactName"],
            phone=values["phone"],
            note=values.get("note") or "",
        )
        return Response({"id": str(created.id)}, status=201)
