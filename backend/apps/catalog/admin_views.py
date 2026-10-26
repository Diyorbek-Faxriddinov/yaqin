"""Admin API: kategoriyalar va atributlar (ruxsat: category.manage).

Ikki daraja: yo'nalish (ikonka bilan) va ichki kategoriya — biznes faqat ichkisiga biriktiriladi.
Slug yaratilgandan keyin o'zgarmaydi. Xabarlar frontend mock'idagi bilan bir xil.
"""

import re
from typing import Any
from uuid import UUID

from django.db import IntegrityError, transaction
from django.db.models import Count, Max
from rest_framework.request import Request
from rest_framework.response import Response

from apps.businesses.models import Business
from apps.catalog.models import Category
from apps.core.api import ApiError, invalid, not_found
from apps.core.revalidate import revalidate
from apps.staff.audit import audit
from apps.staff.authentication import AdminView, current_admin
from apps.staff.models import AuditEntry
from apps.staff.permissions import Permission

Fields = dict[str, list[str]]
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
ATTRIBUTE_KEY = re.compile(r"^[a-z][a-z0-9_]{1,39}$")
OPTION_VALUE = re.compile(r"^[a-z0-9_-]{1,40}$")
ATTRIBUTE_TYPES = {"text", "number", "boolean", "select", "multiselect"}
MAX_ATTRIBUTES = 20


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def localized(value: Any, min_length: int) -> dict[str, str] | None:
    """Ikki tildagi matn: har biri min–60 belgi."""
    record = value if isinstance(value, dict) else {}
    uz, ru = text(record.get("uz")), text(record.get("ru"))
    ok = all(min_length <= len(v) <= 60 for v in (uz, ru))
    return {"uz": uz, "ru": ru} if ok else None


def business_counts() -> dict[UUID, int]:
    """Kategoriya ID → bizneslar soni (barcha holatlar, faqat o'zi)."""
    rows = Business.objects.values("category_id").annotate(n=Count("id"))
    return {row["category_id"]: row["n"] for row in rows}


def ordered_categories() -> list[Category]:
    """Daraxt tartibida: yo'nalish, keyin uning ichki kategoriyalari."""
    categories = list(Category.objects.select_related("parent"))
    roots = [c for c in categories if c.parent_id is None]
    children: dict[UUID, list[Category]] = {}
    for category in categories:
        if category.parent_id is not None:
            children.setdefault(category.parent_id, []).append(category)
    return [c for root in roots for c in (root, *children.get(root.id, []))]


def admin_category(
    category: Category, counts: dict[UUID, int], children: list[UUID] | None = None
) -> dict[str, Any]:
    """`children` — ichki kategoriyalar ID'lari (yo'nalishning bizneslar soni ular bilan)."""
    if children is None:
        children = list(category.children.values_list("id", flat=True))
    own = counts.get(category.id, 0) + sum(counts.get(child, 0) for child in children)
    icon = category.effective_icon_key()
    return {
        "id": str(category.id),
        "slug": category.slug,
        "name": {"uz": category.name_uz, "ru": category.name_ru},
        "iconKey": icon or None,
        "parentId": str(category.parent_id) if category.parent_id else None,
        "businessCount": own,
        "attributes": category.attributes,
    }


def get_category(category_id: UUID, lock: bool = False) -> Category:
    queryset = Category.objects.select_related("parent")
    if lock:
        queryset = queryset.select_for_update(of=("self",))
    category = queryset.filter(pk=category_id).first()
    if category is None:
        raise not_found()
    return category


def parse_attributes(value: Any) -> list[dict[str, Any]]:
    """Kontraktdagi AdminAttribute qoidalari; xato — `attributes.{i}` maydonida."""
    if not isinstance(value, list):
        raise invalid({"attributes": ["Roʻyxat kerak"]})
    if len(value) > MAX_ATTRIBUTES:
        raise invalid({"attributes": ["Koʻpi bilan 20 ta"]})
    fields: Fields = {}
    keys: set[str] = set()
    attributes: list[dict[str, Any]] = []
    for index, raw in enumerate(value):
        raw = raw if isinstance(raw, dict) else {}
        problems: list[str] = []
        key, kind, name = text(raw.get("key")), raw.get("type"), localized(raw.get("name"), 1)
        if not ATTRIBUTE_KEY.match(key):
            problems.append("Kalit: lotin harflari, raqam va _ (2–40)")
        elif key in keys:
            problems.append("Kalit takrorlangan")
        keys.add(key)
        if name is None:
            problems.append("Nomi ikkala tilda kerak")
        if kind not in ATTRIBUTE_TYPES:
            problems.append("Turi notoʻgʻri")

        unit = (text(raw.get("unit"))[:20] or None) if kind == "number" else None
        options: list[dict[str, Any]] = []
        if kind in ("select", "multiselect"):
            given = raw.get("options")
            raw_options: list[Any] = given if isinstance(given, list) else []
            values: set[str] = set()
            for option in raw_options:
                option = option if isinstance(option, dict) else {}
                option_value, label = text(option.get("value")), localized(option.get("label"), 1)
                if OPTION_VALUE.match(option_value) and option_value not in values and label:
                    values.add(option_value)
                    options.append({"value": option_value, "label": label})
            if len(options) != len(raw_options):
                problems.append("Variantlar notoʻgʻri")
            if not 2 <= len(options) <= 30:
                problems.append("2–30 ta variant")

        if problems:
            fields[f"attributes.{index}"] = problems
            continue
        attributes.append(
            {
                "key": key,
                "name": name,
                "type": kind,
                "unit": unit,
                "options": options,
                "filterable": raw.get("filterable") is True,
            }
        )
    if fields:
        raise invalid(fields)
    return attributes


def refresh_search_text(category: Category) -> None:
    """Kategoriya nomi bizneslar qidiruv matniga kiradi (o'zi va ichki kategoriyalari)."""
    ids = [category.id, *category.children.values_list("id", flat=True)]
    businesses = Business.objects.filter(category_id__in=ids).select_related(
        "category", "category__parent", "district"
    )
    for business in businesses:
        business.search_text = business.build_search_text()
    Business.objects.bulk_update(businesses, ["search_text"], batch_size=500)


class CategoryAdminView(AdminView):
    admin_permission = Permission.CATEGORY_MANAGE


class AdminCategoryListView(CategoryAdminView):
    def get(self, request: Request) -> Response:
        counts = business_counts()
        categories = ordered_categories()
        children: dict[UUID, list[UUID]] = {}
        for category in categories:
            if category.parent_id:
                children.setdefault(category.parent_id, []).append(category.id)
        return Response([admin_category(c, counts, children.get(c.id, [])) for c in categories])

    def post(self, request: Request) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        slug, name = text(body.get("slug")), localized(body.get("name"), 2)
        parent_id = body.get("parentId")
        parent = None
        fields: Fields = {}
        if not (SLUG.match(slug) and 2 <= len(slug) <= 60):
            fields["slug"] = ["Lotin harflari, raqamlar va chiziqcha (2–60)"]
        if name is None:
            fields["name"] = ["Nomi ikkala tilda, 2–60 belgi"]
        if parent_id is not None:
            parent_uuid = _uuid(parent_id)
            parent = (
                Category.objects.filter(pk=parent_uuid, parent__isnull=True).first()
                if parent_uuid
                else None
            )
            if parent is None:
                fields["parentId"] = ["Ota-kategoriya — yuqori darajadagi kategoriya"]
        icon = body.get("iconKey")
        if parent_id is None and icon not in Category.IconKey.values:
            fields["iconKey"] = ["Ikonkani tanlang"]
        if fields or name is None:
            raise invalid(fields)
        if Category.objects.filter(slug=slug).exists():
            raise ApiError(409, "slug_taken", "Bu slug band", {"slug": ["Bu slug band"]})

        admin = current_admin(request)
        siblings = Category.objects.filter(parent=parent)
        last = siblings.aggregate(last=Max("position"))["last"]
        try:
            with transaction.atomic():
                category = Category.objects.create(
                    slug=slug,
                    name_uz=name["uz"],
                    name_ru=name["ru"],
                    parent=parent,
                    # Ichki kategoriya ikonkani ota-kategoriyadan oladi
                    icon_key="" if parent else str(icon),
                    position=0 if last is None else last + 1,
                )
                audit(
                    admin,
                    "category.create",
                    AuditEntry.TargetType.CATEGORY,
                    category.id,
                    f"Qoʻshildi: {name['uz']}",
                )
                revalidate("categories", *([f"category:{parent.slug}"] if parent else []))
        except IntegrityError:  # parallel so'rov bir xil slug bilan
            raise ApiError(409, "slug_taken", "Bu slug band", {"slug": ["Bu slug band"]}) from None
        return Response(admin_category(category, {}, []), status=201)


def _uuid(value: Any) -> UUID | None:
    try:
        return UUID(str(value))
    except ValueError:
        return None


class AdminCategoryDetailView(CategoryAdminView):
    def patch(self, request: Request, category_id: UUID) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        admin = current_admin(request)
        with transaction.atomic():
            category = get_category(category_id, lock=True)
            fields: Fields = {}
            name = localized(body["name"], 2) if "name" in body else None
            if "name" in body and name is None:
                fields["name"] = ["Nomi ikkala tilda, 2–60 belgi"]
            if "iconKey" in body:
                if category.parent_id is not None:
                    fields["iconKey"] = ["Ikonka yuqori darajadagi kategoriyada belgilanadi"]
                elif body["iconKey"] not in Category.IconKey.values:
                    fields["iconKey"] = ["Ikonkani tanlang"]
            if fields:
                raise invalid(fields)
            renamed = name is not None and (name["uz"], name["ru"]) != (
                category.name_uz,
                category.name_ru,
            )
            if name is not None:
                category.name_uz, category.name_ru = name["uz"], name["ru"]
            if "iconKey" in body:
                # Ichki kategoriyalar ikonkani ota-kategoriyadan oladi — ular ham o'zgaradi
                category.icon_key = body["iconKey"]
            category.save()
            if renamed:
                refresh_search_text(category)
            audit(
                admin,
                "category.update",
                AuditEntry.TargetType.CATEGORY,
                category.id,
                f"Oʻzgartirildi: {category.name_uz}",
            )
            # Kategoriya nomi biznes kartalarida ham ko'rinadi
            revalidate("categories", f"category:{category.slug}", "businesses")
        return Response(admin_category(category, business_counts()))

    def delete(self, request: Request, category_id: UUID) -> Response:
        admin = current_admin(request)
        with transaction.atomic():
            category = get_category(category_id, lock=True)
            if category.children.exists():
                raise ApiError(409, "has_children", "Avval ichki kategoriyalarni oʻchiring")
            if Business.objects.filter(category=category).exists():
                raise ApiError(
                    409, "has_businesses", "Kategoriyada bizneslar bor — avval ularni koʻchiring"
                )
            category.delete()
            audit(
                admin,
                "category.delete",
                AuditEntry.TargetType.CATEGORY,
                category_id,
                f"Oʻchirildi: {category.name_uz}",
            )
            parent_tags = [f"category:{category.parent.slug}"] if category.parent else []
            revalidate("categories", f"category:{category.slug}", *parent_tags)
        return Response(status=204)


class AdminCategoryAttributesView(CategoryAdminView):
    def put(self, request: Request, category_id: UUID) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        admin = current_admin(request)
        with transaction.atomic():
            category = get_category(category_id, lock=True)
            if category.parent_id is None:
                raise invalid({"attributes": ["Atributlar ichki kategoriyalar uchun"]})
            category.attributes = parse_attributes(body.get("attributes"))
            category.save(update_fields=["attributes"])
            audit(
                admin,
                "category.attributes",
                AuditEntry.TargetType.CATEGORY,
                category.id,
                f"Atributlar ({len(category.attributes)}): {category.name_uz}",
            )
            revalidate(f"category:{category.slug}")
        return Response(admin_category(category, business_counts()))
