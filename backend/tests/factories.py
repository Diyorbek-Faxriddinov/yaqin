"""Test maʼlumotlari — tiplangan yordamchi funksiyalar.

Tumanlar va kategoriyalar migratsiyadagi seed'dan olinadi (haqiqiy slug'lar).
"""

from datetime import UTC, datetime
from itertools import count
from typing import Any

from django.contrib.gis.geos import Point

from apps.accounts.models import User
from apps.businesses.models import Business, Item
from apps.catalog.models import Category, District

# Chilonzor tumani atrofidagi nuqta
CHILONZOR = Point(69.2042, 41.2755, srid=4326)

_sequence = count(1)


def make_user(**fields: Any) -> User:
    n = next(_sequence)
    return User.objects.create(
        **{
            "provider": User.Provider.TELEGRAM,
            "provider_uid": f"tg-{n}",
            "display_name": f"Foydalanuvchi {n}",
            **fields,
        }
    )


def make_business(**fields: Any) -> Business:
    """Standart: Chilonzordagi qoralama sartaroshxona (e'lon qilish shartlarisiz)."""
    n = next(_sequence)
    defaults: dict[str, Any] = {"slug": f"test-biznes-{n}", "name": f"Test biznes {n}"}
    if "category" not in fields:
        defaults["category"] = Category.objects.get(slug="sartaroshxonalar")
    if "district" not in fields:
        defaults["district"] = District.objects.get(slug="chilonzor")
    return Business.objects.create(**{**defaults, **fields})


def publishable(**overrides: Any) -> dict[str, Any]:
    """E'lon qilish uchun majburiy maydonlar (joylashuv, manzil, rozilik)."""
    return {
        "location": CHILONZOR,
        "address_text": "Test koʻchasi, 1-uy",
        "consent_given_by": "Test egasi",
        "consent_given_at": datetime(2026, 10, 1, tzinfo=UTC),
        "status": Business.Status.PUBLISHED,
        **overrides,
    }


def make_item(**fields: Any) -> Item:
    n = next(_sequence)
    business = fields.pop("business", None) or make_business()
    return Item.objects.create(
        **{
            "business": business,
            "slug": f"xizmat-{n}",
            "kind": Item.Kind.SERVICE,
            "name": f"Xizmat {n}",
            "price_type": Item.PriceType.FIXED,
            "price_min": 5_000_000,  # 50 000 so'm — tiyinda
            **fields,
        }
    )
