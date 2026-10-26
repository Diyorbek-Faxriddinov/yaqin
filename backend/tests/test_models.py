from io import StringIO

import pytest
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.geos import Point
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.db.models import Q

from apps.businesses.models import Business, BusinessRequest, Item
from apps.catalog.models import Category, District
from apps.community.models import Complaint, Review
from apps.core.models import PlatformSettings
from apps.core.text import normalize_for_search
from tests.factories import make_business, make_item, make_user, publishable

pytestmark = pytest.mark.django_db


def violates(constraint: str):  # type: ignore[no-untyped-def]
    """Maʼlumotlar bazasi cheklovi buzilishi kutiladi (nomi bo'yicha)."""
    return pytest.raises(IntegrityError, match=constraint)


def test_migrations_match_models() -> None:
    # Model o'zgarib, migratsiya unutilsa — test yiqiladi
    call_command("makemigrations", "--check", "--dry-run", stdout=StringIO())


def test_seed_districts_and_category_tree() -> None:
    assert District.objects.count() == 12
    roots = Category.objects.filter(parent=None)
    assert roots.count() == 12
    assert not roots.filter(icon_key="").exists()
    leaves = Category.objects.filter(parent__isnull=False)
    assert leaves.count() == 49
    # Faqat ikki daraja
    assert not leaves.filter(parent__parent__isnull=False).exists()
    assert Category.objects.get(slug="sartaroshxonalar").effective_icon_key() == "beauty"


def test_root_category_requires_icon() -> None:
    with violates("category_root_has_icon"):
        Category.objects.create(slug="belgisiz", name_uz="Belgisiz", name_ru="Без иконки")


def test_published_business_requires_location_address_and_consent() -> None:
    for missing in ({"location": None}, {"address_text": ""}, {"consent_given_at": None}):
        with transaction.atomic(), violates("business_published_requirements"):
            make_business(**publishable(**missing))
    assert make_business(**publishable()).status == Business.Status.PUBLISHED


def test_draft_business_can_be_incomplete() -> None:
    business = make_business()
    assert business.status == Business.Status.DRAFT
    assert business.location is None
    assert business.rating_average is None


def test_search_text_includes_category_parent_and_district_in_both_languages() -> None:
    business = make_business(name="Baraka sartaroshxonasi")
    text = business.search_text
    for word in ["baraka", "sartaroshxonalar", "parikmaxerskie", "gozallik", "chilonzor"]:
        assert word in text
    assert text == normalize_for_search(text)


def test_trigram_search_finds_typo_and_cyrillic() -> None:
    target = make_business(name="Ustoz sartaroshxonasi")
    make_business(name="Shirin non", category=Category.objects.get(slug="qandolatxonalar"))
    for query in ["ustoz sartarosh", "устоз", "ustos"]:  # oxirgisi — imlo xatosi
        normalized = normalize_for_search(query)
        found = Business.objects.filter(
            Q(search_text__icontains=normalized) | Q(search_text__trigram_word_similar=normalized)
        )
        assert list(found) == [target], query


def test_distance_ordering_in_meters() -> None:
    near = make_business(location=Point(69.2050, 41.2760, srid=4326))
    far = make_business(location=Point(69.2900, 41.3600, srid=4326))
    origin = Point(69.2042, 41.2755, srid=4326)
    ordered = list(
        Business.objects.filter(location__isnull=False)
        .annotate(distance=Distance("location", origin))
        .order_by("distance")
    )
    assert ordered == [near, far]
    assert ordered[0].distance.m < 150
    assert 10_000 < ordered[1].distance.m < 13_000


@pytest.mark.parametrize(
    "fields",
    [
        {"price_type": "fixed", "price_min": None},
        {"price_type": "fixed", "price_min": 0},
        {"price_type": "on_request", "price_min": 100},
        {"price_type": "range", "price_min": 500, "price_max": 500},
        {"price_type": "from", "price_min": 100, "price_max": 900},
        {"price_type": "range", "price_min": 500, "price_max": None},
    ],
)
def test_item_price_must_be_consistent(fields: dict[str, object]) -> None:
    with violates("item_price_consistent"):
        make_item(**fields)


def test_item_duration_only_for_services() -> None:
    with transaction.atomic(), violates("item_duration_only_for_services"):
        make_item(kind=Item.Kind.PRODUCT, duration_minutes=30)
    assert make_item(duration_minutes=45).duration_minutes == 45


def test_item_slug_unique_within_business() -> None:
    item = make_item()
    make_item(slug=item.slug)  # boshqa biznesda — mumkin
    with violates("item_business_slug"):
        make_item(business=item.business, slug=item.slug)


def test_one_review_per_user_but_deleted_authors_do_not_collide() -> None:
    business = make_business()
    user = make_user()
    Review.objects.create(business=business, user=user, rating=5)
    with transaction.atomic(), violates("review_one_per_user"):
        Review.objects.create(business=business, user=user, rating=4)
    Review.objects.create(business=business, user=None, rating=3, status="published")
    Review.objects.create(business=business, user=None, rating=4, status="published")
    with violates("review_rating"):
        Review.objects.create(business=business, user=make_user(), rating=6)


def test_deleting_user_keeps_reviews_anonymous_and_removes_complaints() -> None:
    business = make_business()
    user = make_user()
    review = Review.objects.create(business=business, user=user, rating=5, status="published")
    Complaint.objects.create(business=business, user=user, reason="wrong_info")
    user.delete()
    review.refresh_from_db()
    assert review.user is None
    assert not Complaint.objects.exists()


def test_closed_complaint_and_rejected_review_need_explanation() -> None:
    business = make_business()
    with transaction.atomic(), violates("complaint_other_has_text"):
        Complaint.objects.create(business=business, user=make_user(), reason="other")
    with transaction.atomic(), violates("complaint_closed_has_note"):
        Complaint.objects.create(
            business=business, user=make_user(), reason="fraud", status="resolved"
        )
    with violates("review_rejected_has_reason"):
        Review.objects.create(business=business, user=make_user(), rating=1, status="rejected")


def test_business_request_status_rules() -> None:
    base = {"business_name": "Test", "contact_name": "Ali", "phone": "+998901234567"}
    with transaction.atomic(), violates("request_converted_has_business"):
        BusinessRequest.objects.create(**base, status="converted")
    with violates("request_rejected_has_note"):
        BusinessRequest.objects.create(**base, status="rejected")


def test_rating_sum_stays_within_range() -> None:
    with violates("business_rating_sum_range"):
        make_business(rating_count=2, rating_sum=11)


def test_platform_settings_is_singleton() -> None:
    settings = PlatformSettings.load()
    assert settings.pk == 1
    assert settings.reviews_premoderation is True
    with violates("platform_settings_singleton"):
        PlatformSettings.objects.bulk_create([PlatformSettings(id=2)])
