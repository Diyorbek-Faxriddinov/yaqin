"""Admin parollari: Argon2 xeshi, murakkablik qoidalari (o'zbekcha xabarlar), vaqtinchalik parol."""

import secrets
from functools import cache

from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from apps.staff.models import AdminUser

# Django validatorlari kodlari → xabar (settings.AUTH_PASSWORD_VALIDATORS)
_MESSAGES = {
    "password_too_short": "Parol kamida 12 belgidan iborat boʻlishi kerak",
    "password_too_common": "Bu parol juda oddiy — boshqasini tanlang",
    "password_entirely_numeric": "Parol faqat raqamlardan iborat boʻlmasligi kerak",
    "password_too_similar": "Parol login yoki ismga juda oʻxshash",
}
_TEMPORARY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"


def hash_password(password: str) -> str:
    return make_password(password)


def verify_password(admin: AdminUser, password: str) -> bool:
    """Xesh parametrlari eskirgan bo'lsa (Argon2 sozlamalari o'zgargan) — qayta xeshlanadi."""

    def upgrade(raw: str) -> None:
        admin.password_hash = make_password(raw)
        admin.save(update_fields=["password_hash"])

    return check_password(password, admin.password_hash, setter=upgrade)


@cache
def _dummy_hash() -> str:
    return make_password(secrets.token_urlsafe(16))


def burn_time(password: str) -> None:
    """Login topilmaganda ham xuddi shuncha vaqt sarflanadi — javob vaqtidan login mavjudligini
    bilib bo'lmaydi.
    """
    check_password(password, _dummy_hash())


def password_problems(password: str, admin: AdminUser) -> list[str]:
    try:
        # Validatorlar foydalanuvchidan faqat atributlarni o'qiydi (username, display_name)
        validate_password(password, user=admin)  # type: ignore[arg-type]
    except ValidationError as error:
        return [_MESSAGES.get(e.code or "", e.messages[0]) for e in error.error_list]
    if admin.password_hash and check_password(password, admin.password_hash):
        return ["Yangi parol avvalgisidan farq qilishi kerak"]
    return []


def temporary_password() -> str:
    """Yangi administrator va parol tiklash uchun (bir marta ko'rsatiladi)."""
    return "".join(secrets.choice(_TEMPORARY_ALPHABET) for _ in range(16))
