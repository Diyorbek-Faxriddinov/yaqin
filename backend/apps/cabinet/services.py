"""Egalar takliflari (ADR-0015): tekshirish, solishtirish, tasdiqlash va rad etish.

Qoidalar admin API bilan bir xil — `admin_input.apply_update` va `apply_item` taklif yuborilganda
nusxada (saqlanmasdan), tasdiqda esa haqiqiy yozuvda chaqiriladi. Qiymatlar admin API kirish
shaklida saqlanadi va solishtiriladi (`profile_values`, `item_values`).
"""

import uuid
from datetime import timedelta
from typing import Any

from django.db import transaction
from django.db.models import Max
from django.utils import timezone
from rest_framework.request import Request

from apps.accounts.models import User
from apps.businesses import attributes as item_attributes
from apps.businesses import public
from apps.businesses.admin_input import apply_item, apply_update
from apps.businesses.admin_views import (
    MAX_ITEM_PHOTOS,
    MAX_PHOTOS,
    delete_files_on_commit,
    refresh_public,
    save_photo,
    touch,
)
from apps.businesses.models import Business, BusinessPhoto, Item, ItemPhoto
from apps.businesses.photos import ProcessedPhoto
from apps.businesses.slugs import unique_business_slug, unique_item_slug
from apps.cabinet.models import BusinessChange, BusinessMembership, ChangeUpload
from apps.core.api import ApiError, invalid, money
from apps.staff.audit import audit
from apps.staff.models import AdminUser, AuditEntry

Kind = BusinessChange.Kind
Status = BusinessChange.Status

PROFILE_FIELDS = (
    "name",
    "description",
    "categorySlug",
    "districtSlug",
    "address",
    "location",
    "phones",
    "telegram",
    "instagram",
    "website",
    "amenities",
    "schedule",
)
# Moderatorga alohida belgi bilan ko'rsatiladi
IMPORTANT = frozenset({"name", "categorySlug", "districtSlug", "address", "location"})
ITEM_FIELDS = (
    "kind",
    "name",
    "group",
    "description",
    "price",
    "durationMinutes",
    "attributes",
    "tags",
    "isAvailable",
)
MAX_PENDING_CHANGES = 20
MAX_PENDING_UPLOADS = 40
UPLOAD_TTL = timedelta(hours=24)


# --- Qiymatlar (admin API kirish shaklida) ---


def profile_values(business: Business) -> dict[str, Any]:
    return {
        "name": business.name,
        "description": business.description or None,
        "categorySlug": business.category.slug,
        "districtSlug": business.district.slug,
        "address": {"text": business.address_text, "landmark": business.address_landmark or None},
        "location": public.location(business) if business.location else None,
        "phones": [{"number": p["number"], "label": p.get("label")} for p in business.phones],
        "telegram": business.telegram or None,
        "instagram": business.instagram or None,
        "website": business.website or None,
        "amenities": list(business.amenities),
        "schedule": business.schedule,
    }


def item_values(item: Item) -> dict[str, Any]:
    known = item_attributes.definitions(item.business.category.attributes)
    return {
        "kind": item.kind,
        "name": item.name,
        "group": item.group or None,
        "description": item.description or None,
        "price": {
            "type": item.price_type,
            "min": money(item.price_min),
            "max": money(item.price_max),
        },
        "durationMinutes": item.duration_minutes,
        "attributes": item_attributes.input_values(item.attributes, known),
        "tags": list(item.tags),
        "isAvailable": item.is_available,
    }


def photo_refs(photos: list[BusinessPhoto] | list[ItemPhoto]) -> list[dict[str, Any]]:
    return [{"photoId": str(p.id), "alt": p.alt or None} for p in photos]


# --- Taklif yaratish ---


def _photo_refs_input(
    raw: Any,
    existing: dict[str, BusinessPhoto] | dict[str, ItemPhoto],
    business: Business,
    target: str,
    limit: int,
) -> list[dict[str, Any]]:
    """PhotoRef ro'yxati: mavjud rasmlar shu nishonniki, yangilari shu biznesga yuklangan,
    eskirmagan va boshqa kutilayotgan taklifga bog'lanmagan (shu nishonning eskisi almashtiriladi).
    """
    if not isinstance(raw, list) or len(raw) > limit:
        raise invalid({"photos": [f"Koʻpi bilan {limit} ta rasm"]})
    upload_ids = {str(r.get("uploadId")) for r in raw if isinstance(r, dict) and "uploadId" in r}
    uploads = {
        str(u.id): u
        for u in ChangeUpload.objects.select_related("change").filter(
            business=business,
            id__in=[i for i in upload_ids if _is_uuid(i)],
            created_at__gt=timezone.now() - UPLOAD_TTL,
        )
    }
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for ref in raw:
        if not isinstance(ref, dict) or len({"photoId", "uploadId"} & set(ref)) != 1:
            raise invalid({"photos": ["Rasmlar roʻyxati notoʻgʻri"]})
        alt = ref.get("alt")
        if alt is not None and (not isinstance(alt, str) or len(alt) > 200):
            raise invalid({"photos": ["Tavsif 200 belgigacha"]})
        key, value = (
            ("photoId", str(ref["photoId"]))
            if "photoId" in ref
            else ("uploadId", str(ref["uploadId"]))
        )
        if value in seen:
            raise invalid({"photos": ["Bir rasm ikki marta"]})
        seen.add(value)
        if key == "photoId" and value not in existing:
            raise invalid({"photos": ["Rasm topilmadi — sahifani yangilang"]})
        if key == "uploadId":
            upload = uploads.get(value)
            busy = (
                upload is not None
                and upload.change is not None
                and not (upload.change.status == Status.PENDING and upload.change.target == target)
            )
            if upload is None or busy:
                raise invalid({"photos": ["Yuklangan rasm topilmadi — qayta yuklang"]})
        result.append({key: value, "alt": (alt or "").strip() or None})
    return result


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
    except ValueError:
        return False
    return True


def _fresh_business(business: Business) -> Business:
    return Business.objects.select_related("category", "category__parent", "district").get(
        pk=business.pk
    )


def _item_of(business: Business, item_id: Any) -> Item:
    item = (
        Item.objects.filter(business=business, pk=item_id).first()
        if _is_uuid(str(item_id))
        else None
    )
    if item is None:
        raise invalid({"itemId": ["Mahsulot topilmadi — sahifani yangilang"]})
    item.business = business
    return item


def _draft(kind: str, body: dict[str, Any], business: Business) -> dict[str, Any]:
    """Taklif maydonlari (saqlanmagan): target, item, payload, before, fields, important."""
    if kind == Kind.PROFILE:
        profile = body.get("profile")
        if not isinstance(profile, dict) or not profile or not set(profile) <= set(PROFILE_FIELDS):
            raise invalid({"profile": ["Oʻzgartirish mumkin boʻlgan maydonlarni yuboring"]})
        copy = _fresh_business(business)
        apply_update(copy, profile)
        before_all, after_all = profile_values(business), profile_values(copy)
        fields = [k for k in PROFILE_FIELDS if k in profile and after_all[k] != before_all[k]]
        return {
            "target": "profile",
            "item": None,
            "payload": {k: after_all[k] for k in fields},
            "before": {k: before_all[k] for k in fields},
            "fields": fields,
            "important": bool(IMPORTANT & set(fields)),
        }

    if kind in (Kind.ITEM_CREATE, Kind.ITEM_UPDATE):
        raw_item = body.get("item")
        if not isinstance(raw_item, dict):
            raise invalid({"item": ["Mahsulot maʼlumotlari kerak"]})
        existing_item = _item_of(business, body.get("itemId")) if kind == Kind.ITEM_UPDATE else None
        target = f"item:{existing_item.id}" if existing_item else f"new:{uuid.uuid4()}"
        item_copy = Item(business=business)
        if existing_item is not None:
            item_copy = Item.objects.get(pk=existing_item.pk)
            item_copy.business = business
        apply_item(item_copy, raw_item)
        after = item_values(item_copy)
        item_photos = list(existing_item.photos.all()) if existing_item else []
        refs = _photo_refs_input(
            body.get("photos"),
            {str(p.id): p for p in item_photos},
            business,
            target,
            MAX_ITEM_PHOTOS,
        )
        if existing_item is None:
            fields = [f"item.{k}" for k in ITEM_FIELDS] + (["photos"] if refs else [])
            before: dict[str, Any] = {}
        else:
            current = item_values(existing_item)
            fields = [f"item.{k}" for k in ITEM_FIELDS if after[k] != current[k]]
            if refs != photo_refs(item_photos):
                fields.append("photos")
            before = {"item": current, "photos": photo_refs(item_photos)}
        return {
            "target": target,
            "item": existing_item,
            "payload": {"item": after, "photos": refs},
            "before": before,
            "fields": fields,
            "important": False,
        }

    if kind == Kind.ITEM_DELETE:
        existing_item = _item_of(business, body.get("itemId"))
        return {
            "target": f"item:{existing_item.id}",
            "item": existing_item,
            "payload": {},
            "before": {
                "item": item_values(existing_item),
                "photos": photo_refs(list(existing_item.photos.all())),
            },
            "fields": ["item"],
            "important": False,
        }

    if kind == Kind.PHOTOS:
        business_photos = list(business.photos.all())
        refs = _photo_refs_input(
            body.get("photos"),
            {str(p.id): p for p in business_photos},
            business,
            "photos",
            MAX_PHOTOS,
        )
        return {
            "target": "photos",
            "item": None,
            "payload": {"photos": refs},
            "before": {"photos": photo_refs(business_photos)},
            "fields": ["photos"] if refs != photo_refs(business_photos) else [],
            "important": False,
        }

    raise invalid({"kind": ["Taklif turi notoʻgʻri"]})


def propose(business: Business, user: User, body: dict[str, Any]) -> BusinessChange:
    kind = body.get("kind")
    draft = _draft(str(kind), body, business)
    if not draft["fields"]:
        raise invalid({"non_field_errors": ["Hech narsa oʻzgarmagan"]})
    upload_ids = [r["uploadId"] for r in draft["payload"].get("photos", []) if "uploadId" in r]

    with transaction.atomic():
        Business.objects.select_for_update(of=("self",)).filter(pk=business.pk).first()
        pending = BusinessChange.objects.filter(business=business, status=Status.PENDING)
        replaced = list(pending.filter(target=draft["target"]))
        if pending.count() - len(replaced) >= MAX_PENDING_CHANGES:
            raise ApiError(
                409,
                "too_many_pending",
                f"Koʻrib chiqilmagan takliflar koʻp ({MAX_PENDING_CHANGES}) — tasdiqlanishini"
                " kuting",
            )
        change = BusinessChange.objects.create(
            business=business,
            author=user,
            kind=str(kind),
            item=draft["item"],
            target=draft["target"],
            payload=draft["payload"],
            before=draft["before"],
            fields=draft["fields"],
            important=draft["important"],
        )
        ChangeUpload.objects.filter(id__in=upload_ids).update(change=change)
        for old in replaced:
            _close(old, Status.SUPERSEDED)
    return change


# --- Holatni yopish (rasmlar bilan) ---


def _drop_uploads(uploads: list[ChangeUpload]) -> None:
    names = [str(u.file.name) for u in uploads]
    ChangeUpload.objects.filter(id__in=[u.id for u in uploads]).delete()
    delete_files_on_commit(names)


def _close(
    change: BusinessChange,
    status: str,
    admin: AdminUser | None = None,
    reason: str = "",
) -> None:
    """Rad etish, qaytarib olish, almashtirish: taklifga bog'liq yangi rasmlar o'chiriladi."""
    change.status = status
    change.reviewed_at = timezone.now() if admin else None
    change.reviewed_by = admin
    change.rejection_reason = reason
    change.save(
        update_fields=["status", "reviewed_at", "reviewed_by", "rejection_reason", "updated_at"]
    )
    _drop_uploads(list(change.uploads.all()))


def withdraw_pending(business: Business, user: User) -> None:
    """Egalik tugaganda — shu egasining kutilayotgan takliflari qaytariladi."""
    for change in BusinessChange.objects.filter(
        business=business, author=user, status=Status.PENDING
    ):
        _close(change, Status.WITHDRAWN)


def end_memberships(user: User) -> None:
    """Akkaunt o'chirilganda: kutilayotgan takliflar qaytariladi (muallifsiz taklif tasdiqlanib
    ketmasin), egalik tugagani audit jurnaliga yoziladi. Tranzaksiya ichida chaqiriladi."""
    for change in BusinessChange.objects.filter(author=user, status=Status.PENDING):
        _close(change, Status.WITHDRAWN)
    for membership in BusinessMembership.objects.filter(user=user).select_related("business"):
        audit(
            None,
            "membership.leave",
            AuditEntry.TargetType.MEMBERSHIP,
            membership.id,
            f"{membership.business.name}: akkaunt oʻchirildi (foydalanuvchi {user.id})",
        )
        membership.delete()


def withdraw(change: BusinessChange) -> None:
    with transaction.atomic():
        locked = BusinessChange.objects.select_for_update().get(pk=change.pk)
        if locked.status != Status.PENDING:
            raise ApiError(409, "not_pending", "Taklif allaqachon koʻrib chiqilgan")
        _close(locked, Status.WITHDRAWN)
    change.refresh_from_db()


def reject(change: BusinessChange, admin: AdminUser, reason: str) -> None:
    with transaction.atomic():
        locked = BusinessChange.objects.select_for_update().get(pk=change.pk)
        if locked.status != Status.PENDING:
            raise ApiError(409, "not_pending", "Taklif allaqachon koʻrib chiqilgan")
        _close(locked, Status.REJECTED, admin, reason)
        audit(
            admin,
            "change.reject",
            AuditEntry.TargetType.CHANGE,
            locked.id,
            f"{locked.business.name}: {locked.kind} — rad etildi",
        )
    change.refresh_from_db()


# --- Tasdiqlash ---


def _processed(upload: ChangeUpload) -> ProcessedPhoto:
    with upload.file.open("rb") as handle:
        content = handle.read()
    return ProcessedPhoto(content=content, width=upload.width, height=upload.height)


def _sync_photos(
    refs: list[dict[str, Any]],
    existing: list[BusinessPhoto] | list[ItemPhoto],
    make: Any,
    change: BusinessChange,
) -> None:
    """Rasmlarning yakuniy ro'yxati: ro'yxatda yo'q mavjudlari o'chadi, yangilari ko'chiriladi,
    tartib va tavsiflar ro'yxat bo'yicha. Taklifdan keyin o'chirilgan rasm — tashlab ketiladi.
    """
    by_id = {str(p.id): p for p in existing}
    keep = {r["photoId"] for r in refs if "photoId" in r}
    removed = [p for key, p in by_id.items() if key not in keep]
    removed_files = [str(p.file.name) for p in removed]
    for photo in removed:
        photo.delete()
    uploads = {str(u.id): u for u in change.uploads.all()}
    position = 0
    for ref in refs:
        if "photoId" in ref:
            kept = by_id.get(ref["photoId"])
            if kept is None:
                continue
            kept.position, kept.alt = position, ref.get("alt") or ""
            kept.save(update_fields=["position", "alt"])
        else:
            upload = uploads.get(ref["uploadId"])
            if upload is None:
                continue
            processed = _processed(upload)
            new = make(width=processed.width, height=processed.height, alt=ref.get("alt") or "")
            new.position = position
            save_photo(new, processed)
        position += 1
    delete_files_on_commit(removed_files)
    _drop_uploads(list(uploads.values()))


def target_missing() -> ApiError:
    return ApiError(409, "target_missing", "Mahsulot oʻchirilgan — taklifni rad eting")


def _target_item(change: BusinessChange, business: Business) -> Item:
    item = (
        Item.objects.filter(pk=change.item_id, business=business).first()
        if change.item_id
        else None
    )
    if item is None:
        raise target_missing()
    item.business = business
    return item


def approve(change: BusinessChange, admin: AdminUser) -> None:
    with transaction.atomic():
        business = (
            Business.objects.select_for_update(of=("self",))
            .select_related("category", "category__parent", "district")
            .get(pk=change.business_id)
        )
        locked = BusinessChange.objects.select_for_update(of=("self",)).get(pk=change.pk)
        if locked.status != Status.PENDING:
            raise ApiError(409, "not_pending", "Taklif allaqachon koʻrib chiqilgan")
        old_slug, old_category = business.slug, business.category_id
        payload = locked.payload

        if locked.kind == Kind.PROFILE:
            old_name = business.name
            apply_update(business, payload)
            if business.name != old_name and business.published_at is None:
                business.slug = unique_business_slug(business.name, exclude_id=business.pk)
            business.save()
        elif locked.kind == Kind.ITEM_CREATE:
            item = Item(business=business)
            apply_item(item, payload["item"])
            item.slug = unique_item_slug(business, item.name)
            last = business.items.aggregate(last=Max("position"))["last"]
            item.position = 0 if last is None else last + 1
            item.save()
            _sync_photos(payload["photos"], [], lambda **f: ItemPhoto(item=item, **f), locked)
            locked.item = item
            business.refresh_search_text()
        elif locked.kind == Kind.ITEM_UPDATE:
            updated = _target_item(locked, business)
            apply_item(updated, payload["item"])
            updated.save()
            _sync_photos(
                payload["photos"],
                list(updated.photos.all()),
                lambda **f: ItemPhoto(item=updated, **f),
                locked,
            )
            business.refresh_search_text()
        elif locked.kind == Kind.ITEM_DELETE:
            deleted = _target_item(locked, business)
            files = [str(name) for name in deleted.photos.values_list("file", flat=True)]
            deleted.delete()
            # Xotiradagi taklif hali o'chirilgan mahsulotga ishora qiladi — saqlashda qaytmasin
            locked.item = None
            delete_files_on_commit(files)
            business.refresh_search_text()
        else:
            _sync_photos(
                payload["photos"],
                list(business.photos.all()),
                lambda **f: BusinessPhoto(business=business, **f),
                locked,
            )

        touch(business)
        locked.status, locked.reviewed_at, locked.reviewed_by = (
            Status.APPROVED,
            timezone.now(),
            admin,
        )
        locked.save(update_fields=["status", "reviewed_at", "reviewed_by", "item", "updated_at"])
        audit(
            admin,
            "change.approve",
            AuditEntry.TargetType.CHANGE,
            locked.id,
            f"{business.name}: {locked.kind} — egasi taklifi tasdiqlandi",
        )
        refresh_public(business, old_slug, categories=business.category_id != old_category)
    change.refresh_from_db()


# --- Solishtiruv (moderator uchun) ---


def _photo_view(
    refs: list[dict[str, Any]],
    photos: dict[str, BusinessPhoto] | dict[str, ItemPhoto],
    change: BusinessChange,
    request: Request,
) -> list[dict[str, Any]]:
    view: list[dict[str, Any]] = []
    for ref in refs:
        if "photoId" in ref:
            photo = photos.get(ref["photoId"])
            url = public.image(photo, request)["url"] if photo else None
            view.append({"url": url, "alt": ref.get("alt"), "new": False})
        else:
            url = f"/api/v1/admin/changes/{change.id}/uploads/{ref['uploadId']}"
            view.append({"url": url, "alt": ref.get("alt"), "new": True})
    return view


def _field(
    name: str, before: Any, current: Any, after: Any, important: bool = False
) -> dict[str, Any]:
    return {
        "field": name,
        "important": important,
        "conflict": before != current,
        "before": before,
        "current": current,
        "after": after,
    }


def change_fields(change: BusinessChange, request: Request) -> list[dict[str, Any]]:
    business = _fresh_business(change.business)
    if change.kind == Kind.PROFILE:
        current = profile_values(business)
        return [
            _field(k, change.before.get(k), current[k], change.payload.get(k), k in IMPORTANT)
            for k in change.fields
        ]

    if change.kind == Kind.PHOTOS:
        photos = {str(p.id): p for p in business.photos.all()}
        current_refs = photo_refs(list(photos.values()))
        result = _field(
            "photos",
            change.before.get("photos"),
            current_refs,
            change.payload.get("photos"),
        )
        result["before"] = _photo_view(change.before.get("photos", []), photos, change, request)
        result["current"] = _photo_view(current_refs, photos, change, request)
        result["after"] = _photo_view(change.payload.get("photos", []), photos, change, request)
        return [result]

    item = (
        Item.objects.filter(pk=change.item_id, business=business).first()
        if change.item_id
        else None
    )
    if item is not None:
        item.business = business
    item_photos = {str(p.id): p for p in item.photos.all()} if item else {}
    current_item = item_values(item) if item else None
    before_item = change.before.get("item")

    if change.kind == Kind.ITEM_DELETE:
        return [_field("item", before_item, current_item, None)]

    fields: list[dict[str, Any]] = []
    for name in change.fields:
        if name == "photos":
            before_refs = change.before.get("photos", [])
            current_refs = photo_refs(list(item_photos.values()))
            entry = _field(
                "photos",
                before_refs if change.kind == Kind.ITEM_UPDATE else None,
                current_refs if change.kind == Kind.ITEM_UPDATE else None,
                change.payload.get("photos"),
            )
            entry["before"] = (
                _photo_view(before_refs, item_photos, change, request)
                if entry["before"] is not None
                else None
            )
            entry["current"] = (
                _photo_view(current_refs, item_photos, change, request)
                if entry["current"] is not None
                else None
            )
            entry["after"] = _photo_view(
                change.payload.get("photos", []), item_photos, change, request
            )
            fields.append(entry)
            continue
        key = name.removeprefix("item.")
        after = change.payload["item"].get(key)
        if change.kind == Kind.ITEM_CREATE:
            fields.append(_field(name, None, None, after))
        else:
            fields.append(
                _field(
                    name,
                    (before_item or {}).get(key),
                    current_item.get(key) if current_item else None,
                    after,
                )
            )
    return fields


def has_conflict(change: BusinessChange, request: Request) -> bool:
    if change.status != Status.PENDING:
        return False
    return any(f["conflict"] for f in change_fields(change, request))
