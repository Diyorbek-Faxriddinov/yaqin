"""Mahsulot teglari uchun takliflar (ADR-0016): bir xil so'zni har safar yozmaslik uchun."""

from collections import Counter

from apps.businesses.models import Business, Item
from apps.core.text import normalize_for_search

MAX_CATEGORY_TAGS = 20
MAX_SUGGESTIONS = 40


def tag_suggestions(business: Business) -> list[str]:
    """Avval shu biznes teglari, keyin shu kategoriyada e'lon qilinganlarning eng ko'plari."""
    result: dict[str, str] = {}
    for tags in Item.objects.filter(business=business).values_list("tags", flat=True):
        for tag in tags:
            result.setdefault(normalize_for_search(tag), tag)

    counts: Counter[str] = Counter()
    spelling: dict[str, str] = {}
    others = Item.objects.filter(
        business__category=business.category, business__status=Business.Status.PUBLISHED
    ).exclude(business=business)
    for tags in others.values_list("tags", flat=True):
        for tag in tags:
            key = normalize_for_search(tag)
            counts[key] += 1
            spelling.setdefault(key, tag)
    for key, _ in counts.most_common(MAX_CATEGORY_TAGS):
        result.setdefault(key, spelling[key])
    return list(result.values())[:MAX_SUGGESTIONS]
