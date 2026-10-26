"""Sharhlar va reyting. Reyting — chop etilgan sharhlar yig'indisi va soni (Business.rating_*);
o'zgarishlar F() ifodalari bilan atomar, parallel so'rovlarda ham to'g'ri.
"""

from django.db.models import F

from apps.businesses.models import Business
from apps.community.models import Review
from apps.core.revalidate import revalidate


def _business_tags(business: Business) -> tuple[str, ...]:
    # Reyting kartalarda, profil va sharhlar sahifasida ko'rinadi (handoff, 6-bo'lim)
    return ("businesses", f"business:{business.slug}", f"reviews:{business.slug}")


def add_to_rating(review: Review) -> None:
    Business.objects.filter(pk=review.business_id).update(
        rating_count=F("rating_count") + 1, rating_sum=F("rating_sum") + review.rating
    )
    revalidate(*_business_tags(review.business))


def remove_from_rating(review: Review) -> None:
    Business.objects.filter(pk=review.business_id).update(
        rating_count=F("rating_count") - 1, rating_sum=F("rating_sum") - review.rating
    )
    revalidate(*_business_tags(review.business))
