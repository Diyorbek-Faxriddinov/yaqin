"""Ommaviy API: har bir javob kontraktga qarshi tekshiriladi (assert_matches_contract)."""

from datetime import UTC, datetime
from typing import Any
from unittest.mock import patch

import pytest
from django.contrib.gis.geos import Point
from django.core.cache import cache
from django.test import Client
from rest_framework.throttling import ScopedRateThrottle

from apps.businesses.models import Business, BusinessPhoto, BusinessRequest
from apps.catalog.models import Category, District
from apps.community.models import Review
from apps.core.models import PlatformSettings
from apps.stats.models import DailyStats
from tests.contract import assert_matches_contract
from tests.factories import make_business, make_item, make_user, publishable

pytestmark = pytest.mark.django_db

WEEKDAYS = {
    "is24x7": False,
    "days": [
        {"weekday": d, "intervals": [{"open": "09:00", "close": "18:00"}]} for d in range(1, 6)
    ],
}
# Dushanba 10:00 (Toshkent) — ish kuni; shanba 12:00 — dam olish kuni
MONDAY_10 = datetime(2026, 10, 26, 5, 0, tzinfo=UTC)
SATURDAY_12 = datetime(2026, 10, 31, 7, 0, tzinfo=UTC)


def get(client: Client, path: str, **params: Any) -> Any:
    response = client.get(f"/api/v1{path}", params)
    assert_matches_contract(response)
    return response


@pytest.fixture
def data() -> dict[str, Business]:
    ustoz = make_business(
        **publishable(
            name="Ustoz sartaroshxonasi",
            slug="ustoz-sartaroshxonasi",
            location=Point(69.2050, 41.2760, srid=4326),
            rating_count=37,
            rating_sum=178,
            schedule={"is24x7": True, "days": []},
            phones=[{"number": "+998901234567", "label": None}],
            telegram="ustoz_barber",
        )
    )
    tandir = make_business(
        **publishable(
            name="Tandir uyi",
            slug="tandir-uyi",
            category=Category.objects.get(slug="restoranlar"),
            district=District.objects.get(slug="mirzo-ulugbek"),
            location=Point(69.3350, 41.3380, srid=4326),
            rating_count=76,
            rating_sum=357,
            schedule=WEEKDAYS,
            is_verified=False,
        )
    )
    oqtosh = make_business(
        **publishable(
            name="Oq tosh kafe",
            slug="oq-tosh-kafe",
            category=Category.objects.get(slug="kafelar"),
            district=District.objects.get(slug="yangihayot"),
            location=Point(69.2400, 41.2000, srid=4326),
        )
    )
    draft = make_business(name="Qoralama sartaroshxona", slug="qoralama")
    make_item(business=ustoz, slug="soch-olish", name="Soch olish", price_min=5_000_000)
    make_item(
        business=ustoz,
        slug="soqol",
        name="Soqol",
        price_type="range",
        price_min=3_000_000,
        price_max=8_000_000,
    )
    for position in (1, 0):
        BusinessPhoto.objects.create(
            business=ustoz,
            file=f"businesses/{ustoz.id}/rasm-{position}.webp",
            width=1200,
            height=900,
            position=position,
        )
    return {"ustoz": ustoz, "tandir": tandir, "oqtosh": oqtosh, "draft": draft}


# --- Katalog ---


def test_category_tree_counts_only_published_and_sums_children(
    client: Client, data: dict[str, Business]
) -> None:
    tree = get(client, "/categories").json()
    assert len(tree) == 12
    beauty = next(node for node in tree if node["slug"] == "gozallik")
    assert beauty["businessCount"] == 1  # qoralama hisoblanmaydi
    barbers = next(c for c in beauty["children"] if c["slug"] == "sartaroshxonalar")
    assert barbers["businessCount"] == 1
    assert barbers["iconKey"] == "beauty"
    food = next(node for node in tree if node["slug"] == "ovqatlanish")
    assert food["businessCount"] == 2


def test_category_detail_localized_with_attributes(client: Client) -> None:
    category = Category.objects.get(slug="kafelar")
    category.attributes = [
        {
            "key": "halal",
            "name": {"uz": "Halol", "ru": "Халяль"},
            "type": "boolean",
            "unit": None,
            "options": [],
            "filterable": True,
        }
    ]
    category.save()
    detail = get(client, "/categories/kafelar", lang="ru").json()
    assert detail["name"] == "Кафе"
    assert detail["parent"]["slug"] == "ovqatlanish"
    assert detail["attributes"] == [
        {
            "key": "halal",
            "name": "Халяль",
            "type": "boolean",
            "unit": None,
            "options": [],
            "filterable": True,
        }
    ]


def test_unknown_category_is_404(client: Client) -> None:
    response = get(client, "/categories/bunday-yoq")
    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_districts(client: Client) -> None:
    districts = get(client, "/districts", lang="ru").json()
    assert len(districts) == 12
    chilonzor = next(d for d in districts if d["slug"] == "chilonzor")
    assert chilonzor["name"] == "Чиланзар"
    assert chilonzor["center"] == {"lat": 41.2755, "lng": 69.2042}


# --- Bizneslar ro'yxati ---


def slugs(response: Any) -> list[str]:
    return [item["slug"] for item in response.json()["items"]]


def test_list_shows_only_published(client: Client, data: dict[str, Business]) -> None:
    response = get(client, "/businesses")
    assert response.json()["total"] == 3
    assert "qoralama" not in slugs(response)
    ustoz = next(i for i in response.json()["items"] if i["slug"] == "ustoz-sartaroshxonasi")
    assert ustoz["rating"] == {"average": 4.8, "count": 37}
    assert ustoz["priceRange"] == {
        "min": {"amount": 3_000_000, "currency": "UZS"},
        "max": {"amount": 8_000_000, "currency": "UZS"},
    }
    assert ustoz["coverImage"]["url"].endswith("rasm-0.webp")  # birinchi — muqova
    assert ustoz["distanceMeters"] is None


def test_filters_by_parent_category_and_district(client: Client, data: dict[str, Business]) -> None:
    assert sorted(slugs(get(client, "/businesses", category="ovqatlanish"))) == [
        "oq-tosh-kafe",
        "tandir-uyi",
    ]
    assert slugs(get(client, "/businesses", category="kafelar")) == ["oq-tosh-kafe"]
    assert slugs(get(client, "/businesses", district="chilonzor")) == ["ustoz-sartaroshxonasi"]


@pytest.mark.parametrize(
    "query",
    ["sartarosh", "сартарош", "ustoz sartarosh", "ustos", "Парикмахерская", "chilonzor"],
)
def test_search_latin_cyrillic_typo_and_category(
    client: Client, data: dict[str, Business], query: str
) -> None:
    assert slugs(get(client, "/businesses", q=query)) == ["ustoz-sartaroshxonasi"]


def test_search_requires_every_word(client: Client, data: dict[str, Business]) -> None:
    assert slugs(get(client, "/businesses", q="ustoz yunusobod")) == []


def test_distance_sort_returns_meters(client: Client, data: dict[str, Business]) -> None:
    response = get(client, "/businesses", sort="distance", lat=41.2755, lng=69.2042)
    items = response.json()["items"]
    assert [i["slug"] for i in items] == ["ustoz-sartaroshxonasi", "oq-tosh-kafe", "tandir-uyi"]
    assert items[0]["distanceMeters"] < 150
    assert all(i["distanceMeters"] > 0 for i in items)


def test_rating_and_recommended_sorts(client: Client, data: dict[str, Business]) -> None:
    # Reyting: o'rtacha yuqori birinchi, sharhsizlar oxirida
    assert slugs(get(client, "/businesses", sort="rating")) == [
        "ustoz-sartaroshxonasi",
        "tandir-uyi",
        "oq-tosh-kafe",
    ]
    # Tavsiya (frontend mock formulasi): o'rtacha × log10(sharhlar + 10) + 0,5 (tekshirilgan).
    # Tandir: 4,70 × log10(86) ≈ 9,09; Ustoz: 4,81 × log10(47) + 0,5 ≈ 8,54; Oq tosh: 3 × 1 = 3
    assert slugs(get(client, "/businesses")) == [
        "tandir-uyi",
        "ustoz-sartaroshxonasi",
        "oq-tosh-kafe",
    ]


@pytest.mark.parametrize(
    ("params", "field"),
    [
        ({"sort": "distance"}, "sort"),
        ({"lat": 41.3}, "lat"),
        ({"lat": 91, "lng": 69}, "lat"),
        ({"pageSize": 51}, "pageSize"),
        ({"page": 0}, "page"),
        ({"sort": "random"}, "sort"),
    ],
)
def test_invalid_list_params_return_field_errors(
    client: Client, params: dict[str, Any], field: str
) -> None:
    response = get(client, "/businesses", **params)
    assert response.status_code == 400
    assert response.json()["code"] == "validation_error"
    assert field in response.json()["fields"]


def test_open_now_filter(client: Client, data: dict[str, Business]) -> None:
    with patch("apps.businesses.views.timezone.now", return_value=MONDAY_10):
        monday = sorted(slugs(get(client, "/businesses", openNow="true")))
    with patch("apps.businesses.views.timezone.now", return_value=SATURDAY_12):
        saturday = slugs(get(client, "/businesses", openNow="true"))
    # Ish vaqti nomaʼlum bo'lgan biznes "hozir ochiq"da ko'rinmaydi
    assert monday == ["tandir-uyi", "ustoz-sartaroshxonasi"]
    assert saturday == ["ustoz-sartaroshxonasi"]


def test_pagination(client: Client, data: dict[str, Business]) -> None:
    first = get(client, "/businesses", pageSize=2, sort="rating").json()
    second = get(client, "/businesses", pageSize=2, page=2, sort="rating").json()
    assert first["total"] == second["total"] == 3
    assert len(first["items"]) == 2
    assert [i["slug"] for i in second["items"]] == ["oq-tosh-kafe"]


# --- Biznes profili, katalog, sharhlar ---


def test_business_detail(client: Client, data: dict[str, Business]) -> None:
    detail = get(client, "/businesses/ustoz-sartaroshxonasi", lang="ru").json()
    assert detail["category"]["name"] == "Парикмахерские"
    assert detail["district"] == {"slug": "chilonzor", "name": "Чиланзар"}
    assert detail["phones"] == [{"number": "+998901234567", "label": None}]
    assert detail["telegram"] == "ustoz_barber"
    assert [g["url"].rsplit("/", 1)[1] for g in detail["gallery"]] == ["rasm-0.webp", "rasm-1.webp"]
    assert detail["address"] == {"text": "Test koʻchasi, 1-uy", "landmark": None}


def test_draft_business_is_not_public(client: Client, data: dict[str, Business]) -> None:
    for path in [
        "/businesses/qoralama",
        "/businesses/qoralama/items",
        "/businesses/qoralama/reviews",
    ]:
        assert get(client, path).status_code == 404


def test_items_and_single_item(client: Client, data: dict[str, Business]) -> None:
    items = get(client, "/businesses/ustoz-sartaroshxonasi/items").json()
    assert [i["slug"] for i in items] == ["soch-olish", "soqol"]
    soqol = get(client, "/businesses/ustoz-sartaroshxonasi/items/soqol").json()
    assert soqol["price"] == {
        "type": "range",
        "min": {"amount": 3_000_000, "currency": "UZS"},
        "max": {"amount": 8_000_000, "currency": "UZS"},
    }
    assert soqol["images"] == []
    assert get(client, "/businesses/ustoz-sartaroshxonasi/items/yoq").status_code == 404


def test_reviews_only_published_newest_first_with_anonymized_authors(
    client: Client, data: dict[str, Business]
) -> None:
    business = data["ustoz"]
    Review.objects.create(
        business=business,
        user=make_user(display_name="Malika Rahimova"),
        rating=5,
        status="published",
    )
    Review.objects.create(business=business, user=make_user(), rating=4, status="pending")
    Review.objects.create(business=business, user=None, rating=3, status="published", text="Yaxshi")
    response = get(client, "/businesses/ustoz-sartaroshxonasi/reviews")
    body = response.json()
    assert body["total"] == 2
    assert [r["authorName"] for r in body["items"]] == ["Oʻchirilgan foydalanuvchi", "Malika R."]
    assert body["items"][0]["text"] == "Yaxshi"
    assert body["items"][1]["reply"] is None


# --- Xarita va takliflar ---


def test_map_markers(client: Client, data: dict[str, Business]) -> None:
    markers = get(client, "/map/markers", category="gozallik").json()
    assert [m["slug"] for m in markers] == ["ustoz-sartaroshxonasi"]
    assert markers[0]["location"] == {"lat": 41.276, "lng": 69.205}


def test_suggest(client: Client, data: dict[str, Business]) -> None:
    result = get(client, "/search/suggest", q="sartarosh").json()
    assert [c["slug"] for c in result["categories"]] == ["sartaroshxonalar"]
    assert result["businesses"] == [
        {
            "slug": "ustoz-sartaroshxonasi",
            "name": "Ustoz sartaroshxonasi",
            "categoryName": "Sartaroshxonalar",
        }
    ]
    short = get(client, "/search/suggest", q="s")
    assert short.status_code == 400
    assert "q" in short.json()["fields"]


# --- Statistika hodisalari ---


def post(client: Client, path: str, body: dict[str, Any]) -> Any:
    response = client.post(f"/api/v1{path}", body, content_type="application/json")
    assert_matches_contract(response)
    return response


def test_event_increments_daily_counter(client: Client, data: dict[str, Business]) -> None:
    business = data["ustoz"]
    for _ in range(2):
        assert (
            post(
                client, "/events", {"type": "call_click", "businessId": str(business.id)}
            ).status_code
            == 202
        )
    post(client, "/events", {"type": "profile_view", "businessId": str(business.id)})
    stats = DailyStats.objects.get(business=business)
    assert (stats.calls, stats.profile_views, stats.telegram_clicks) == (2, 1, 0)


def test_event_rejects_unknown_type_and_unpublished_business(
    client: Client, data: dict[str, Business]
) -> None:
    unknown = post(client, "/events", {"type": "hack", "businessId": str(data["ustoz"].id)})
    assert unknown.status_code == 400
    draft = post(client, "/events", {"type": "call_click", "businessId": str(data["draft"].id)})
    assert draft.status_code == 400
    assert not DailyStats.objects.exists()


def test_event_rate_limit(
    client: Client, data: dict[str, Business], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "events", "2/min")
    body = {"type": "profile_view", "businessId": str(data["ustoz"].id)}
    statuses = [post(client, "/events", body).status_code for _ in range(3)]
    assert statuses == [202, 202, 429]


# --- "Biznesingizni qo'shing" va sozlamalar ---

REQUEST = {
    "businessName": "Hunarmand ustaxonasi",
    "activity": "Mebel",
    "districtSlug": "yashnobod",
    "address": None,
    "contactName": "Rustam",
    "phone": "90 123 45 67",
    "note": None,
    "agree": True,
}


def test_business_request_created_with_normalized_phone(client: Client) -> None:
    response = post(client, "/business-requests", REQUEST)
    assert response.status_code == 201
    created = BusinessRequest.objects.get(id=response.json()["id"])
    assert created.phone == "+998901234567"
    assert created.district is not None
    assert created.district.slug == "yashnobod"
    assert created.status == BusinessRequest.Status.NEW


@pytest.mark.parametrize(
    ("override", "field"),
    [
        ({"agree": False}, "agree"),
        ({"phone": "12345"}, "phone"),
        ({"businessName": "A"}, "businessName"),
        ({"districtSlug": "yoq-tuman"}, "districtSlug"),
    ],
)
def test_business_request_validation(client: Client, override: dict[str, Any], field: str) -> None:
    response = post(client, "/business-requests", {**REQUEST, **override})
    assert response.status_code == 400
    assert field in response.json()["fields"]
    assert not BusinessRequest.objects.exists()


def test_business_request_closed_and_rate_limited(
    client: Client, monkeypatch: pytest.MonkeyPatch
) -> None:
    settings = PlatformSettings.load()
    settings.business_requests_open = False
    settings.save()
    closed = post(client, "/business-requests", REQUEST)
    assert closed.status_code == 403
    assert closed.json()["code"] == "requests_closed"

    settings.business_requests_open = True
    settings.save()
    # Yopiq paytdagi urinish ham kvotaga kiradi (DRF cheklovi ko'rinishdan oldin) — tozalaymiz
    cache.clear()
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "business_requests", "1/hour")
    assert post(client, "/business-requests", REQUEST).status_code == 201
    limited = post(client, "/business-requests", REQUEST)
    assert limited.status_code == 429
    assert limited.json()["code"] == "too_many_attempts"


def test_public_settings(client: Client) -> None:
    assert get(client, "/settings").json() == {
        "businessRequestsOpen": True,
        "contacts": {"telegram": None, "email": None, "phone": None},
    }
