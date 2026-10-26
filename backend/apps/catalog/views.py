"""Ommaviy katalog: kategoriyalar daraxti, bitta kategoriya, tumanlar."""

from collections import Counter
from typing import Any

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business
from apps.catalog.models import Category, District
from apps.core.api import Lang, lang_of, not_found


def category_ref(category: Category, lang: Lang) -> dict[str, Any]:
    return {
        "id": str(category.id),
        "slug": category.slug,
        "name": category.name(lang),
        "iconKey": category.effective_icon_key() or None,
    }


def district_ref(district: District, lang: Lang) -> dict[str, Any]:
    return {"slug": district.slug, "name": district.name(lang)}


def _published_counts() -> Counter[Any]:
    """Kategoriya ID → e'lon qilingan bizneslar soni (bitta so'rov)."""
    rows = (
        Business.objects.filter(status=Business.Status.PUBLISHED)
        .values_list("category_id", flat=True)
        .order_by()
    )
    return Counter(rows)


def category_tree(lang: Lang) -> list[dict[str, Any]]:
    categories = list(Category.objects.select_related("parent"))
    counts = _published_counts()
    children: dict[Any, list[Category]] = {}
    for category in categories:
        if category.parent_id:
            children.setdefault(category.parent_id, []).append(category)

    def node(category: Category) -> dict[str, Any]:
        kids = [node(child) for child in children.get(category.id, [])]
        # Yo'nalish soni = o'zi + ichki kategoriyalardagi bizneslar
        own = counts.get(category.id, 0)
        return {
            **category_ref(category, lang),
            "businessCount": own + sum(kid["businessCount"] for kid in kids),
            "children": kids,
        }

    return [node(category) for category in categories if category.parent_id is None]


def _localized_attribute(attribute: dict[str, Any], lang: Lang) -> dict[str, Any]:
    """AdminAttribute (ikki tilda) → ommaviy AttributeDefinition (joriy tilda)."""
    return {
        "key": attribute["key"],
        "name": attribute["name"][lang],
        "type": attribute["type"],
        "unit": attribute.get("unit"),
        "options": [
            {"value": option["value"], "label": option["label"][lang]}
            for option in attribute.get("options", [])
        ],
        "filterable": bool(attribute.get("filterable", False)),
    }


class CategoryTreeView(APIView):
    def get(self, request: Request) -> Response:
        return Response(category_tree(lang_of(request)))


class CategoryDetailView(APIView):
    def get(self, request: Request, slug: str) -> Response:
        lang = lang_of(request)
        tree = category_tree(lang)
        nodes = {node["slug"]: node for root in tree for node in [root, *root["children"]]}
        node = nodes.get(slug)
        if node is None:
            raise not_found()
        category = Category.objects.select_related("parent").get(slug=slug)
        parent = category_ref(category.parent, lang) if category.parent else None
        return Response(
            {
                **node,
                "parent": parent,
                "attributes": [_localized_attribute(a, lang) for a in category.attributes],
            }
        )


class DistrictListView(APIView):
    def get(self, request: Request) -> Response:
        lang = lang_of(request)
        return Response(
            [
                {
                    "id": str(district.id),
                    "slug": district.slug,
                    "name": district.name(lang),
                    "center": {"lat": district.center.y, "lng": district.center.x},
                }
                for district in District.objects.all()
            ]
        )
