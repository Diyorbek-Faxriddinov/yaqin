"""Admin API: platforma sozlamalari (ruxsat: settings.manage)."""

import re
from typing import Any

from django.db import transaction
from rest_framework.request import Request
from rest_framework.response import Response

from apps.core.api import invalid
from apps.core.models import PlatformSettings
from apps.core.revalidate import revalidate
from apps.staff.audit import audit
from apps.staff.authentication import AdminView, current_admin
from apps.staff.models import AuditEntry
from apps.staff.permissions import Permission

TELEGRAM = re.compile(r"^[A-Za-z0-9_]{5,32}$")
EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PHONE = re.compile(r"^\+998\d{9}$")


def text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def settings_payload(settings: PlatformSettings) -> dict[str, Any]:
    return {
        "reviewsPremoderation": settings.reviews_premoderation,
        "businessRequestsOpen": settings.business_requests_open,
        "contacts": {
            "telegram": settings.contact_telegram or None,
            "email": settings.contact_email or None,
            "phone": settings.contact_phone or None,
        },
    }


class AdminSettingsView(AdminView):
    admin_permission = Permission.SETTINGS_MANAGE

    def get(self, request: Request) -> Response:
        return Response(settings_payload(PlatformSettings.load()))

    def put(self, request: Request) -> Response:
        body = request.data if isinstance(request.data, dict) else {}
        raw_contacts = body.get("contacts")
        contacts: dict[str, Any] = raw_contacts if isinstance(raw_contacts, dict) else {}
        telegram = text(contacts.get("telegram")).removeprefix("@")
        email, phone = text(contacts.get("email")), text(contacts.get("phone"))
        fields: dict[str, list[str]] = {}
        for key in ("reviewsPremoderation", "businessRequestsOpen"):
            if not isinstance(body.get(key), bool):
                fields[key] = ["Qiymat kerak"]
        if telegram and not TELEGRAM.match(telegram):
            fields["contacts.telegram"] = ["Foydalanuvchi nomi notoʻgʻri"]
        if email and (not EMAIL.match(email) or len(email) > 120):
            fields["contacts.email"] = ["Email notoʻgʻri"]
        if phone and not PHONE.match(phone):
            fields["contacts.phone"] = ["Raqam formati: +998XXXXXXXXX"]
        if fields:
            raise invalid(fields)

        admin = current_admin(request)
        with transaction.atomic():
            settings = PlatformSettings.objects.select_for_update().get(pk=1)
            before = settings_payload(settings)
            settings.reviews_premoderation = body["reviewsPremoderation"]
            settings.business_requests_open = body["businessRequestsOpen"]
            settings.contact_telegram, settings.contact_email = telegram, email
            settings.contact_phone = phone
            settings.save()
            after = settings_payload(settings)
            changed = [
                label
                for key, label in (
                    ("reviewsPremoderation", "sharhlar moderatsiyasi"),
                    ("businessRequestsOpen", "soʻrov formasi"),
                    ("contacts", "kontaktlar"),
                )
                if before[key] != after[key]
            ]
            audit(
                admin,
                "settings.update",
                AuditEntry.TargetType.SETTINGS,
                "platform",
                ", ".join(changed) or "oʻzgarishsiz",
            )
            # Ommaviy sahifalar (Aloqa, so'rov formasi) keshdan o'qiydi
            revalidate("settings")
        return Response(after)
