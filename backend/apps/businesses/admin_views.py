"""Admin API: bizneslar, rasmlar va katalog (mahsulot/xizmatlar) — ADR-0007, ADR-0009.

Har bir o'zgarish audit jurnaliga yoziladi va ommaviy saytga taalluqli bo'lsa, frontend keshini
yangilaydi (tranzaksiyadan keyin).
"""

from typing import Any
from uuid import UUID

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Count, Max, Q, QuerySet
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.response import Response

from apps.businesses import public
from apps.businesses.admin_input import apply_item, apply_update, parse_create, text
from apps.businesses.models import Business, BusinessPhoto, BusinessRequest, Item
from apps.businesses.photos import process_photo
from apps.businesses.slugs import unique_business_slug, unique_item_slug
from apps.catalog.views import category_ref, district_ref
from apps.core.api import (
    ApiError,
    Lang,
    invalid,
    lang_of,
    not_found,
    page_params,
    page_payload,
    page_slice,
)
from apps.core.revalidate import revalidate
from apps.staff.audit import audit
from apps.staff.authentication import AdminView, current_admin
from apps.staff.models import AuditEntry
from apps.staff.permissions import Permission

Target = AuditEntry.TargetType
MAX_PHOTOS = 12


class BusinessAdminView(AdminView):
    admin_permission: str | None = Permission.BUSINESS_VIEW


def body_of(request: Request) -> dict[str, Any]:
    return request.data if isinstance(request.data, dict) else {}


def get_business(business_id: UUID, lock: bool = False) -> Business:
    queryset = Business.objects.select_related("category", "category__parent", "district")
    if lock:
        queryset = queryset.select_for_update(of=("self",))
    business = queryset.filter(pk=business_id).first()
    if business is None:
        raise not_found()
    return business


def refresh_public(business: Business, *old_slugs: str, categories: bool = False) -> None:
    """Ommaviy sahifalar keshi (handoff, 6-bo'lim): ro'yxatlar va biznes sahifasi; holat yoki
    kategoriya o'zgarganda — kategoriyalar (bizneslar soni) ham.
    """
    slugs = dict.fromkeys((business.slug, *old_slugs))
    tags = [
        "businesses",
        *(["categories"] if categories else []),
        *(f"business:{s}" for s in slugs),
    ]
    revalidate(*tags)


def touch(business: Business) -> None:
    """Rasm va katalog o'zgarishi biznesning `updatedAt` ini yangilaydi (ro'yxat tartibi)."""
    Business.objects.filter(pk=business.pk).update(updated_at=timezone.now())


def photo_payload(photo: BusinessPhoto, request: Request) -> dict[str, Any]:
    return {"id": str(photo.id), **public.image(photo, request)}


def consent_payload(business: Business) -> dict[str, Any] | None:
    if business.consent_given_at is None:
        return None
    return {
        "givenBy": business.consent_given_by,
        "givenAt": business.consent_given_at.isoformat(),
        "note": business.consent_note or None,
    }


def admin_business(business: Business, lang: Lang, request: Request) -> dict[str, Any]:
    return {
        "id": str(business.id),
        "slug": business.slug,
        "name": business.name,
        "description": business.description or None,
        "category": category_ref(business.category, lang),
        "district": district_ref(business.district, lang),
        "address": {
            "text": business.address_text,
            "landmark": business.address_landmark or None,
        },
        "location": public.location(business) if business.location else None,
        "phones": [{"number": p["number"], "label": p.get("label")} for p in business.phones],
        "telegram": business.telegram or None,
        "instagram": business.instagram or None,
        "schedule": business.schedule,
        "status": business.status,
        "consent": consent_payload(business),
        "photos": [photo_payload(photo, request) for photo in business.photos.all()],
        "createdAt": business.created_at.isoformat(),
        "updatedAt": business.updated_at.isoformat(),
    }


def list_item(business: Any, lang: Lang) -> dict[str, Any]:
    return {
        "id": str(business.id),
        "slug": business.slug,
        "name": business.name,
        "category": category_ref(business.category, lang),
        "district": district_ref(business.district, lang),
        "status": business.status,
        "hasConsent": business.has_consent,
        "photosCount": business.photos_count,
        "itemsCount": business.items_count,
        "updatedAt": business.updated_at.isoformat(),
    }


class AdminBusinessListView(BusinessAdminView):
    admin_permissions = {"POST": Permission.BUSINESS_EDIT}

    def get(self, request: Request) -> Response:
        lang = lang_of(request)
        page, page_size = page_params(request)
        queryset: QuerySet[Business] = Business.objects.select_related(
            "category", "category__parent", "district"
        )
        q = request.query_params.get("q", "").strip()[:100]
        if q:
            queryset = queryset.filter(Q(name__icontains=q) | Q(slug__icontains=q.lower()))
        status = request.query_params.get("status")
        if status:
            if status not in Business.Status.values:
                raise invalid({"status": ["Holat notoʻgʻri"]})
            queryset = queryset.filter(status=status)
        if request.query_params.get("missingConsent") == "true":
            queryset = queryset.filter(consent_given_at__isnull=True)
        total = queryset.count()
        rows = queryset.annotate(
            photos_count=Count("photos", distinct=True), items_count=Count("items", distinct=True)
        ).order_by("-updated_at", "id")
        return Response(
            {
                "items": [list_item(b, lang) for b in page_slice(rows, page, page_size)],
                "total": total,
                "page": page,
                "pageSize": page_size,
            }
        )

    def post(self, request: Request) -> Response:
        name, category, district = parse_create(body_of(request))
        admin = current_admin(request)
        with transaction.atomic():
            business = Business.objects.create(
                slug=unique_business_slug(name),
                name=name,
                category=category,
                district=district,
            )
            audit(admin, "business.create", Target.BUSINESS, business.id, f"Yaratildi: {name}")
        # Qoralama saytda ko'rinmaydi — kesh yangilanmaydi
        return Response(admin_business(business, lang_of(request), request), status=201)


class AdminBusinessDetailView(BusinessAdminView):
    def get(self, request: Request, business_id: UUID) -> Response:
        return Response(admin_business(get_business(business_id), lang_of(request), request))

    def patch(self, request: Request, business_id: UUID) -> Response:
        body = body_of(request)
        admin = current_admin(request)
        # Holat — business.publish; qolgan maydonlar — business.edit (ikkalasi bo'lsa — ikkalasi)
        needed = [Permission.BUSINESS_PUBLISH] if "status" in body else []
        if set(body) - {"status"}:
            needed.append(Permission.BUSINESS_EDIT)
        if not all(admin.has_permission(p) for p in needed):
            raise ApiError(403, "permission_denied", "Bu amal uchun ruxsatingiz yoʻq")

        with transaction.atomic():
            business = get_business(business_id, lock=True)
            old_slug, old_status, old_name = business.slug, business.status, business.name
            changed = apply_update(business, body)
            # Slug faqat hali hech qachon e'lon qilinmagan biznesda nom bilan o'zgaradi —
            # e'lon qilingan sahifa manzili (havolalar, qidiruv tizimlari) buzilmasin
            if business.name != old_name and business.published_at is None:
                business.slug = unique_business_slug(business.name, exclude_id=business.pk)
            if business.status == Business.Status.PUBLISHED and business.published_at is None:
                business.published_at = timezone.now()
            business.save()
            status_changed = business.status != old_status
            action = f"business.status.{business.status}" if status_changed else "business.update"
            audit(
                admin,
                action,
                Target.BUSINESS,
                business.id,
                f"{business.name}: {', '.join(changed) or 'oʻzgarishsiz'}",
            )
            refresh_public(business, old_slug, categories=True)
        return Response(admin_business(business, lang_of(request), request))


class AdminPhotoUploadView(BusinessAdminView):
    admin_permission = Permission.BUSINESS_EDIT

    def post(self, request: Request, business_id: UUID) -> Response:
        # Biznes avval tekshiriladi — yo'q bo'lsa rasm umuman qayta ishlanmaydi
        if not Business.objects.filter(pk=business_id).exists():
            raise not_found()
        upload = request.FILES.get("file")
        if upload is None:
            raise invalid({"file": ["Rasm tanlang"]})
        processed = process_photo(upload)
        alt = request.data.get("alt", "")
        admin = current_admin(request)
        stored: str | None = None
        try:
            with transaction.atomic():
                business = get_business(business_id, lock=True)
                if business.photos.count() >= MAX_PHOTOS:
                    raise invalid({"file": [f"Koʻpi bilan {MAX_PHOTOS} ta rasm"]})
                last = business.photos.aggregate(last=Max("position"))["last"]
                photo = BusinessPhoto(
                    business=business,
                    width=processed.width,
                    height=processed.height,
                    alt=text(alt)[:200],
                    position=0 if last is None else last + 1,
                )
                photo.file.save("photo.webp", ContentFile(processed.content), save=False)
                stored = photo.file.name
                photo.save()
                touch(business)
                audit(
                    admin,
                    "photo.upload",
                    Target.PHOTO,
                    photo.id,
                    f"Rasm qoʻshildi: {business.name}",
                )
                refresh_public(business)
        except Exception:
            # Yozuv saqlanmadi — diskda yetim fayl qolmasin
            if stored:
                default_storage.delete(stored)
            raise
        return Response(photo_payload(photo, request), status=201)


class AdminPhotoOrderView(BusinessAdminView):
    admin_permission = Permission.BUSINESS_EDIT

    def put(self, request: Request, business_id: UUID) -> Response:
        ids = body_of(request).get("photoIds")
        admin = current_admin(request)
        with transaction.atomic():
            business = get_business(business_id, lock=True)
            photos = {str(p.id): p for p in business.photos.all()}
            if not isinstance(ids, list) or len(ids) != len(photos) or set(ids) != set(photos):
                raise ApiError(400, "validation_error", "Rasmlar roʻyxati mos emas")
            for position, photo_id in enumerate(ids):
                photos[photo_id].position = position
            BusinessPhoto.objects.bulk_update(photos.values(), ["position"])
            touch(business)
            audit(admin, "photo.reorder", Target.BUSINESS, business.id, "Rasmlar tartibi oʻzgardi")
            refresh_public(business)
        return Response(status=204)


class AdminPhotoDetailView(BusinessAdminView):
    admin_permission = Permission.BUSINESS_EDIT

    def delete(self, request: Request, business_id: UUID, photo_id: UUID) -> Response:
        admin = current_admin(request)
        with transaction.atomic():
            business = get_business(business_id, lock=True)
            photo = business.photos.filter(pk=photo_id).first()
            if photo is None:
                raise not_found()
            name = photo.file.name
            photo.delete()
            touch(business)
            audit(
                admin, "photo.delete", Target.PHOTO, photo_id, f"Rasm oʻchirildi: {business.name}"
            )
            refresh_public(business)
            # Fayl faqat yozuv o'chgani aniq bo'lgach o'chiriladi
            transaction.on_commit(lambda: default_storage.delete(name))
        return Response(status=204)


class AdminItemListView(BusinessAdminView):
    admin_permissions = {"POST": Permission.BUSINESS_EDIT}

    def get(self, request: Request, business_id: UUID) -> Response:
        business = get_business(business_id)
        return Response([public.item(entry) for entry in business.items.all()])

    def post(self, request: Request, business_id: UUID) -> Response:
        admin = current_admin(request)
        with transaction.atomic():
            business = get_business(business_id, lock=True)
            item = Item(business=business)
            apply_item(item, body_of(request))
            item.slug = unique_item_slug(business, item.name)
            last = business.items.aggregate(last=Max("position"))["last"]
            item.position = 0 if last is None else last + 1
            item.save()
            touch(business)
            audit(admin, "item.create", Target.ITEM, item.id, f"{business.name}: {item.name}")
            refresh_public(business)
        return Response(public.item(item), status=201)


class AdminItemDetailView(BusinessAdminView):
    admin_permission = Permission.BUSINESS_EDIT

    def _get(self, business: Business, item_id: UUID) -> Item:
        item = business.items.filter(pk=item_id).first()
        if item is None:
            raise not_found()
        return item

    def put(self, request: Request, business_id: UUID, item_id: UUID) -> Response:
        admin = current_admin(request)
        with transaction.atomic():
            business = get_business(business_id, lock=True)
            item = self._get(business, item_id)
            # Slug o'zgarmaydi — mahsulot sahifasi manzili barqaror
            apply_item(item, body_of(request))
            item.save()
            touch(business)
            audit(admin, "item.update", Target.ITEM, item.id, f"{business.name}: {item.name}")
            refresh_public(business)
        return Response(public.item(item))

    def delete(self, request: Request, business_id: UUID, item_id: UUID) -> Response:
        admin = current_admin(request)
        with transaction.atomic():
            business = get_business(business_id, lock=True)
            item = self._get(business, item_id)
            item.delete()
            touch(business)
            audit(
                admin,
                "item.delete",
                Target.ITEM,
                item_id,
                f"{business.name}: {item.name} oʻchirildi",
            )
            refresh_public(business)
        return Response(status=204)


# --- "Biznesingizni qo'shing" so'rovlari (telefon raqamlari bor — business.edit) ---


def admin_request(entry: BusinessRequest, lang: Lang) -> dict[str, Any]:
    return {
        "id": str(entry.id),
        "businessName": entry.business_name,
        "activity": entry.activity or None,
        "district": district_ref(entry.district, lang) if entry.district else None,
        "address": entry.address or None,
        "contactName": entry.contact_name,
        "phone": entry.phone,
        "note": entry.note or None,
        "status": entry.status,
        "adminNote": entry.admin_note or None,
        "businessId": str(entry.business_id) if entry.business_id else None,
        "createdAt": entry.created_at.isoformat(),
        "updatedAt": entry.updated_at.isoformat(),
    }


def get_request(request_id: UUID) -> BusinessRequest:
    entry = (
        BusinessRequest.objects.select_for_update(of=("self",))
        .select_related("district")
        .filter(pk=request_id)
        .first()
    )
    if entry is None:
        raise not_found()
    if entry.status == BusinessRequest.Status.CONVERTED:
        raise ApiError(409, "already_converted", "Soʻrovdan biznes yaratilgan — holati oʻzgarmaydi")
    return entry


class RequestAdminView(BusinessAdminView):
    admin_permission = Permission.BUSINESS_EDIT


class AdminRequestListView(RequestAdminView):
    def get(self, request: Request) -> Response:
        lang = lang_of(request)
        entries = BusinessRequest.objects.select_related("district")
        status = request.query_params.get("status")
        if status is not None:
            if status not in BusinessRequest.Status.values:
                raise invalid({"status": ["Holat notoʻgʻri"]})
            entries = entries.filter(status=status)
        entries = entries.order_by("-created_at", "id")
        return Response(page_payload(entries, request, lambda e: admin_request(e, lang)))


class AdminRequestDetailView(RequestAdminView):
    def patch(self, request: Request, request_id: UUID) -> Response:
        body = body_of(request)
        admin = current_admin(request)
        with transaction.atomic():
            entry = get_request(request_id)
            status = body.get("status")
            if status not in ("new", "contacted", "rejected"):
                raise invalid({"status": ["Holat notoʻgʻri"]})
            note = text(body["adminNote"]) if "adminNote" in body else entry.admin_note
            if len(note) > 500:
                raise invalid({"adminNote": ["Koʻpi bilan 500 belgi"]})
            if status == BusinessRequest.Status.REJECTED and len(note) < 3:
                raise invalid({"adminNote": ["Rad etish sababini yozing (kamida 3 belgi)"]})
            entry.status, entry.admin_note = status, note
            # Yopilgan so'rov 12 oy ichida o'chiriladi (maxfiylik siyosati) — hisob shu vaqtdan
            entry.closed_at = timezone.now() if status == BusinessRequest.Status.REJECTED else None
            entry.save()
            audit(admin, f"request.{status}", Target.REQUEST, entry.id, entry.business_name)
        return Response(admin_request(entry, lang_of(request)))


class AdminRequestConvertView(RequestAdminView):
    def post(self, request: Request, request_id: UUID) -> Response:
        name, category, district = parse_create(body_of(request))
        admin = current_admin(request)
        with transaction.atomic():
            entry = get_request(request_id)
            # Joylashuv, rasmlar va rozilik — joyiga borganda (ADR-0007)
            business = Business.objects.create(
                slug=unique_business_slug(name),
                name=name,
                category=category,
                district=district,
                address_text=entry.address,
                phones=[{"number": entry.phone, "label": None}],
            )
            entry.status, entry.business = BusinessRequest.Status.CONVERTED, business
            entry.closed_at = timezone.now()
            entry.save()
            audit(admin, "request.convert", Target.REQUEST, entry.id, f"Qoralama: {name}")
            audit(admin, "business.create", Target.BUSINESS, business.id, f"Soʻrovdan: {name}")
        return Response(admin_business(business, lang_of(request), request), status=201)
