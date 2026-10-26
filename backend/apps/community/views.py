"""Mijoz kabineti: sevimlilar, sharhlar, shikoyatlar (kirish talab qilinadi)."""

from typing import Any

from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.authentication import CustomerSessionAuthentication, IsCustomer, customer
from apps.businesses import public
from apps.businesses.models import Business
from apps.community.models import Complaint, Favorite, Review
from apps.community.services import add_to_rating, remove_from_rating
from apps.core.api import ApiError, lang_of, not_found
from apps.core.models import PlatformSettings


class CustomerView(APIView):
    authentication_classes = [CustomerSessionAuthentication]
    permission_classes = [IsCustomer]


def business_ref(business: Business) -> dict[str, str]:
    return {"slug": business.slug, "name": business.name}


def published_by_id(business_id: Any) -> Business:
    business = Business.objects.filter(id=business_id, status=Business.Status.PUBLISHED).first()
    if business is None:
        raise not_found()
    return business


# --- Sevimlilar ---


class FavoritesView(CustomerView):
    def get(self, request: Request) -> Response:
        """Faqat hozir ham e'lon qilingan bizneslar, oxirgi qo'shilgani birinchi."""
        lang = lang_of(request)
        ids = list(
            Favorite.objects.filter(user=customer(request))
            .order_by("-created_at")
            .values_list("business_id", flat=True)
        )
        businesses = {b.id: b for b in public.published().filter(id__in=ids)}
        return Response(
            [public.summary(businesses[pk], lang, request) for pk in ids if pk in businesses]
        )


class FavoriteIdsView(CustomerView):
    def get(self, request: Request) -> Response:
        ids = Favorite.objects.filter(
            user=customer(request), business__status=Business.Status.PUBLISHED
        ).values_list("business_id", flat=True)
        return Response([str(pk) for pk in ids])


class FavoriteView(CustomerView):
    def put(self, request: Request, business_id: Any) -> Response:
        Favorite.objects.get_or_create(
            user=customer(request), business=published_by_id(business_id)
        )
        return Response(status=204)

    def delete(self, request: Request, business_id: Any) -> Response:
        Favorite.objects.filter(user=customer(request), business_id=business_id).delete()
        return Response(status=204)


# --- Sharhlar ---


def my_review_payload(review: Review) -> dict[str, Any]:
    return {
        "id": str(review.id),
        "business": business_ref(review.business),
        "rating": review.rating,
        "text": review.text or None,
        "status": review.status,
        "rejectionReason": review.rejection_reason or None,
        "createdAt": review.created_at.isoformat(),
    }


class ReviewInput(serializers.Serializer[dict[str, Any]]):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    text = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)


def create_review(request: Request, slug: str) -> Response:
    """POST /businesses/{slug}/reviews — bitta foydalanuvchi bitta biznesga bitta sharh."""
    business = Business.objects.filter(slug=slug, status=Business.Status.PUBLISHED).first()
    if business is None:
        raise not_found()
    data = ReviewInput(data=request.data)
    data.is_valid(raise_exception=True)
    # Oldindan moderatsiya o'chirilgan bo'lsa — darhol chop etiladi (keyin rad etish mumkin)
    premoderation = PlatformSettings.load().reviews_premoderation
    try:
        with transaction.atomic():
            review = Review.objects.create(
                business=business,
                user=customer(request),
                rating=data.validated_data["rating"],
                text=(data.validated_data.get("text") or "").strip(),
                status=Review.Status.PENDING if premoderation else Review.Status.PUBLISHED,
            )
            if review.status == Review.Status.PUBLISHED:
                add_to_rating(review)
    except IntegrityError:
        raise ApiError(
            409, "review_exists", "Siz bu biznesga allaqachon sharh qoldirgansiz"
        ) from None
    return Response(my_review_payload(review), status=201)


class MyReviewsView(CustomerView):
    def get(self, request: Request) -> Response:
        reviews = (
            Review.objects.filter(user=customer(request))
            .select_related("business")
            .order_by("-created_at")
        )
        return Response([my_review_payload(review) for review in reviews])


class MyReviewView(CustomerView):
    def delete(self, request: Request, review_id: Any) -> Response:
        # Boshqa foydalanuvchining sharhi ham "topilmadi" — mavjudligi oshkor qilinmaydi
        review = (
            Review.objects.filter(id=review_id, user=customer(request))
            .select_related("business")
            .first()
        )
        if review is None:
            raise not_found()
        with transaction.atomic():
            if review.status == Review.Status.PUBLISHED:
                remove_from_rating(review)
            review.delete()
        return Response(status=204)


# --- Shikoyatlar ---


class ComplaintInput(serializers.Serializer[dict[str, Any]]):
    businessId = serializers.UUIDField()
    reason = serializers.ChoiceField(choices=Complaint.Reason.choices)
    text = serializers.CharField(max_length=1000, required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        text = (attrs.get("text") or "").strip()
        if attrs["reason"] == Complaint.Reason.OTHER and len(text) < 10:
            raise serializers.ValidationError({"text": "Kamida 10 belgi"})
        if not Business.objects.filter(
            id=attrs["businessId"], status=Business.Status.PUBLISHED
        ).exists():
            raise serializers.ValidationError({"businessId": "Biznes topilmadi"})
        return {**attrs, "text": text}


def complaint_payload(complaint: Complaint) -> dict[str, Any]:
    return {
        "id": str(complaint.id),
        "business": business_ref(complaint.business),
        "reason": complaint.reason,
        "text": complaint.text or None,
        "status": complaint.status,
        "resolutionNote": complaint.resolution_note or None,
        "createdAt": complaint.created_at.isoformat(),
    }


class ComplaintCreateView(CustomerView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "complaints"

    def post(self, request: Request) -> Response:
        data = ComplaintInput(data=request.data)
        data.is_valid(raise_exception=True)
        user = customer(request)
        complaint = Complaint.objects.create(
            business_id=data.validated_data["businessId"],
            user=user,
            reason=data.validated_data["reason"],
            text=data.validated_data["text"],
        )
        return Response(complaint_payload(complaint), status=201)


class MyComplaintsView(CustomerView):
    def get(self, request: Request) -> Response:
        complaints = (
            Complaint.objects.filter(user=customer(request))
            .select_related("business")
            .order_by("-created_at")
        )
        return Response([complaint_payload(complaint) for complaint in complaints])
