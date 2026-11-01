"""Admin biznes va mahsulot formalarini tekshirish.

Xabarlar frontend mock'idagi (`src/mocks/admin-handlers.ts`) bilan bir xil — forma maydonlari
ostida ko'rsatiladi. Har bir funksiya `Fields` (maydon → xabarlar) yig'adi; bo'sh bo'lmasa 400.
"""

import math
import re
from datetime import datetime
from typing import Any

from django.contrib.gis.geos import Point
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.utils.dateparse import parse_datetime

from apps.businesses import attributes as item_attributes
from apps.businesses.models import Business, Item
from apps.businesses.slugs import slugify
from apps.catalog.models import Category, District
from apps.core.api import invalid
from apps.core.schedule import schedule_problem

Fields = dict[str, list[str]]

MAX_PHONES = 5
MAX_ATTRIBUTES = 20
PHONE = re.compile(r"^\+998\d{9}$")
TELEGRAM = re.compile(r"^[A-Za-z0-9_]{5,32}$")
INSTAGRAM = re.compile(r"^[A-Za-z0-9_.]{1,30}$")


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def leaf_category(slug: Any) -> Category | None:
    """Biznes faqat ichki (ota-kategoriyasi bor) kategoriyaga biriktiriladi."""
    if not isinstance(slug, str):
        return None
    return Category.objects.select_related("parent").filter(slug=slug, parent__isnull=False).first()


def district(slug: Any) -> District | None:
    return District.objects.filter(slug=slug).first() if isinstance(slug, str) else None


def parse_create(body: dict[str, Any]) -> tuple[str, Category, District]:
    """POST /admin/businesses (va 3.7 da so'rovdan yaratish) uchun umumiy tekshiruv."""
    fields: Fields = {}
    name = text(body.get("name"))
    category = leaf_category(body.get("categorySlug"))
    found_district = district(body.get("districtSlug"))
    if not 2 <= len(name) <= 120:
        fields["name"] = ["2–120 belgi"]
    if category is None:
        fields["categorySlug"] = ["Ichki kategoriyani tanlang"]
    if found_district is None:
        fields["districtSlug"] = ["Tumanni tanlang"]
    if fields or category is None or found_district is None:
        raise invalid(fields)
    return name, category, found_district


def _point(value: Any) -> Point | None:
    if not isinstance(value, dict):
        return None
    lat, lng = value.get("lat"), value.get("lng")
    if not all(isinstance(v, int | float) and not isinstance(v, bool) for v in (lat, lng)):
        return None
    lat, lng = float(lat), float(lng)  # type: ignore[arg-type]
    if not (math.isfinite(lat) and math.isfinite(lng)) or abs(lat) > 90 or abs(lng) > 180:
        return None
    return Point(lng, lat, srid=4326)


def _consent_time(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = parse_datetime(value)
    except ValueError:
        return None
    # Vaqt mintaqasiz qiymat noaniq — qabul qilinmaydi (kontrakt: date-time)
    return parsed if parsed is not None and parsed.tzinfo is not None else None


def apply_update(business: Business, body: dict[str, Any]) -> list[str]:
    """PATCH: faqat yuborilgan maydonlar biznesga yoziladi (saqlanmaydi). Qaytaradi —
    o'zgartirilgan maydonlar nomlari (audit uchun). Xato bo'lsa — 400, biznes o'zgarmagan holda
    qolishi shart emas (chaqiruvchi saqlamaydi).
    """
    fields: Fields = {}

    if "name" in body:
        name = text(body["name"])
        if 2 <= len(name) <= 120:
            business.name = name
        else:
            fields["name"] = ["2–120 belgi"]
    if "description" in body:
        description = text(body["description"])
        if len(description) <= 2000:
            business.description = description
        else:
            fields["description"] = ["Koʻpi bilan 2000 belgi"]
    if "categorySlug" in body:
        category = leaf_category(body["categorySlug"])
        if category:
            business.category = category
        else:
            fields["categorySlug"] = ["Ichki kategoriyani tanlang"]
    if "districtSlug" in body:
        found = district(body["districtSlug"])
        if found:
            business.district = found
        else:
            fields["districtSlug"] = ["Tumanni tanlang"]
    if "address" in body:
        address = body["address"] if isinstance(body["address"], dict) else {}
        address_text, landmark = text(address.get("text")), text(address.get("landmark"))
        if len(address_text) <= 300 and len(landmark) <= 200:
            business.address_text, business.address_landmark = address_text, landmark
        else:
            fields["address"] = ["Juda uzun"]
    if "location" in body:
        point = _point(body["location"])
        if body["location"] is None or point is not None:
            business.location = point
        else:
            fields["location"] = ["Koordinata notoʻgʻri"]
    if "phones" in body:
        phones = body["phones"] if isinstance(body["phones"], list) else None
        valid = (
            phones is not None
            and len(phones) <= MAX_PHONES
            and all(isinstance(p, dict) and PHONE.match(str(p.get("number", ""))) for p in phones)
        )
        if valid and phones is not None:
            business.phones = [
                {"number": p["number"], "label": text(p.get("label"))[:40] or None} for p in phones
            ]
        else:
            fields["phones"] = ["Raqam formati: +998XXXXXXXXX"]
    for key, pattern in (("telegram", TELEGRAM), ("instagram", INSTAGRAM)):
        if key in body:
            handle = text(body[key]).removeprefix("@")
            if handle and not pattern.match(handle):
                fields[key] = ["Foydalanuvchi nomi notoʻgʻri"]
            else:
                setattr(business, key, handle)
    if "website" in body:
        website = text(body["website"])
        if not website or _valid_website(website):
            business.website = website
        else:
            fields["website"] = ["Toʻliq manzil: https://..."]
    if "amenities" in body:
        amenities = body["amenities"]
        if isinstance(amenities, list) and set(amenities) <= set(Business.Amenity.values):
            # Kontraktdagi tartibda, takrorsiz
            business.amenities = [a for a in Business.Amenity.values if a in amenities]
        else:
            fields["amenities"] = ["Qulaylik notoʻgʻri"]
    if "schedule" in body:
        if body["schedule"] is None or schedule_problem(body["schedule"]) is None:
            business.schedule = body["schedule"]
        else:
            fields["schedule"] = ["Ish vaqti notoʻgʻri"]
    if "consent" in body:
        consent = body["consent"]
        if consent is None:
            business.consent_given_by, business.consent_given_at = "", None
            business.consent_note = ""
        else:
            consent = consent if isinstance(consent, dict) else {}
            given_by, given_at = text(consent.get("givenBy")), _consent_time(consent.get("givenAt"))
            note = text(consent.get("note"))
            if not 2 <= len(given_by) <= 100 or given_at is None or len(note) > 500:
                fields["consent"] = ["Kim va qachon rozilik berganini kiriting"]
            else:
                business.consent_given_by, business.consent_given_at = given_by, given_at
                business.consent_note = note
    if "status" in body:
        if body["status"] in Business.Status.values:
            business.status = body["status"]
        else:
            fields["status"] = ["Holat notoʻgʻri"]

    if not fields and business.status == Business.Status.PUBLISHED:
        fields.update(publish_problems(business))
    if fields:
        raise invalid(fields)
    return list(body)


def _valid_website(value: str) -> bool:
    if len(value) > 300:
        return False
    try:
        URLValidator(schemes=["http", "https"])(value)
    except ValidationError:
        return False
    return True


def publish_problems(business: Business) -> Fields:
    """E'lon qilish shartlari (kontraktdagi PATCH tavsifi; DB cheklovi ham shuni talab qiladi)."""
    fields: Fields = {}
    if business.location is None:
        fields["location"] = ["Xaritada joylashuvni belgilang"]
    if not business.address_text.strip():
        fields["address"] = ["Manzilni kiriting"]
    if not business.has_consent:
        fields["consent"] = ["Egasining roziligini qayd eting"]
    return fields


def _amount(value: Any) -> int | None:
    if not isinstance(value, dict) or value.get("currency", "UZS") != "UZS":
        return None
    amount = value.get("amount")
    return amount if isinstance(amount, int) and not isinstance(amount, bool) else None


def apply_item(item: Item, body: dict[str, Any]) -> None:
    """ItemInput (POST va PUT — to'liq almashtirish) → mahsulot maydonlari.

    Xususiyatlar biznes kategoriyasining ta'riflari bo'yicha tekshiriladi (attributes.py).
    """
    fields: Fields = {}
    name = text(body.get("name"))
    raw_price = body.get("price")
    price: dict[str, Any] = raw_price if isinstance(raw_price, dict) else {}
    price_type = str(price.get("type", ""))
    raw_kind = body.get("kind")
    kind = raw_kind if isinstance(raw_kind, str) else ""
    low, high = _amount(price.get("min")), _amount(price.get("max"))
    duration = body.get("durationMinutes")
    attributes = body.get("attributes", [])
    stored: list[dict[str, Any]] = []

    if not 2 <= len(name) <= 120:
        fields["name"] = ["2–120 belgi"]
    if kind not in Item.Kind.values:
        fields["kind"] = ["Turini tanlang"]
    if price_type not in Item.PriceType.values:
        fields["price"] = ["Narx turini tanlang"]
    elif price_type != Item.PriceType.ON_REQUEST:
        if low is None or low <= 0:
            fields["price"] = ["Narxni kiriting"]
        elif price_type == Item.PriceType.RANGE and (high is None or high <= low):
            fields["price"] = ["Yuqori chegara pastkisidan katta boʻlsin"]
    if duration is not None and (
        not isinstance(duration, int) or isinstance(duration, bool) or not 5 <= duration <= 1440
    ):
        fields["durationMinutes"] = ["5–1440 daqiqa"]
    if not isinstance(attributes, list) or len(attributes) > MAX_ATTRIBUTES:
        fields["attributes"] = ["Koʻpi bilan 20 ta"]
    elif any(
        not isinstance(a, dict) or len(text(a.get("name"))) > 40 or len(text(a.get("value"))) > 120
        for a in attributes
    ):
        fields["attributes"] = ["Nom — 40, qiymat — 120 belgigacha"]
    else:
        known = item_attributes.definitions(item.business.category.attributes)
        stored, problems = item_attributes.parse_input(attributes, known, slugify)
        if problems:
            fields["attributes"] = problems
    if len(text(body.get("description"))) > 1000:
        fields["description"] = ["1000 belgigacha"]
    if fields:
        raise invalid(fields)

    item.kind, item.name = kind, name
    item.group = text(body.get("group"))[:60]
    item.description = text(body.get("description"))
    item.price_type = price_type
    item.price_min = None if price_type == Item.PriceType.ON_REQUEST else low
    item.price_max = high if price_type == Item.PriceType.RANGE else None
    # Davomiylik faqat xizmatlarda (DB cheklovi)
    item.duration_minutes = duration if kind == Item.Kind.SERVICE else None
    item.attributes = stored
    item.is_available = body.get("isAvailable") is not False
