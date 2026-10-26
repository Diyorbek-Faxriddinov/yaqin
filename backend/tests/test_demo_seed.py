"""⚠ Demo maʼlumotlar buyrug'i (`seed_demo`): faqat DEBUG, qat'iy ID'lar, toza olib tashlash."""

import io
import json
from typing import Any

import pytest
from django.core.management import CommandError, call_command

from apps.accounts.models import User
from apps.businesses.models import Business, BusinessRequest, Item
from apps.catalog.models import Category
from apps.community.models import Review
from apps.core.management.commands.seed_demo import DATA_FILE
from apps.staff.models import AdminUser
from apps.stats.models import DailyStats
from tests.factories import make_admin, make_business

pytestmark = pytest.mark.django_db


def seed(*args: str) -> str:
    out = io.StringIO()
    call_command("seed_demo", *args, stdout=out)
    return out.getvalue()


@pytest.fixture
def data() -> dict[str, Any]:
    return dict(json.loads(DATA_FILE.read_text(encoding="utf-8")))


def test_refuses_without_debug(settings: Any) -> None:
    settings.DEBUG = False
    with pytest.raises(CommandError, match="DEBUG"):
        seed()
    assert not Business.objects.exists()


def test_seed_matches_frontend_fixtures(settings: Any, data: dict[str, Any]) -> None:
    settings.DEBUG = True
    seed()
    businesses = data["businesses"]
    assert Business.objects.count() == len(businesses)
    assert Item.objects.count() == sum(len(b["items"]) for b in businesses)
    published_reviews = sum(len(b["reviews"]) for b in businesses)
    assert Review.objects.filter(status="published").count() == published_reviews
    assert BusinessRequest.objects.count() == len(data["requests"])
    assert DailyStats.objects.exists()

    first = businesses[0]
    business = Business.objects.get(pk=first["id"])
    assert business.slug == first["slug"]
    assert business.status == Business.Status.PUBLISHED
    assert business.rating_average == first["rating"]["average"]
    assert "demo" in business.description
    # Faqat atributsiz kategoriyalarga demo atributlar
    slug, attributes = next(iter(data["categoryAttributes"].items()))
    assert Category.objects.get(slug=slug).attributes == attributes
    # E2E administratorlari faqat so'ralganda
    assert not AdminUser.objects.exists()

    with pytest.raises(CommandError, match="--reset"):
        seed()


def test_reset_and_remove_touch_only_demo_records(settings: Any) -> None:
    settings.DEBUG = True
    own = make_business(name="Haqiqiy biznes")
    seed("--e2e-admins")
    assert set(AdminUser.objects.values_list("username", flat=True)) == {"root", "moderator"}
    seed("--reset")
    assert Business.objects.filter(pk=own.pk).exists()

    assert "oʻchirildi" in seed("--remove")
    assert list(Business.objects.values_list("pk", flat=True)) == [own.pk]
    assert not User.objects.filter(provider_uid__startswith="seed-").exists()
    assert not BusinessRequest.objects.exists()


def test_e2e_admins_refuse_foreign_root(settings: Any) -> None:
    settings.DEBUG = True
    make_admin(is_root=True, username="haqiqiy")
    with pytest.raises(CommandError, match="Root"):
        seed("--e2e-admins")
