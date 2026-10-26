"""Tashqi kirish provayderlari: Telegram Login Widget va Google Identity Services (ADR-0006).

Ikkalasi ham faqat imzoni tekshiradi va profil qaytaradi; foydalanuvchi yaratish — views'da.
Sozlanmagan bo'lsa (token/client ID yo'q) — halol rad etiladi, "ishlaydi" deb ko'rsatilmaydi.
"""

import hashlib
import hmac
import time
from dataclasses import dataclass
from typing import Any

from django.conf import settings

from apps.core.api import ApiError


@dataclass(frozen=True)
class Profile:
    provider: str
    uid: str
    display_name: str
    avatar_url: str


def _invalid(message: str = "Kirish maʼlumotlari tasdiqlanmadi") -> ApiError:
    return ApiError(401, "invalid_credentials", message)


def _unavailable(provider: str) -> ApiError:
    return ApiError(401, "provider_unavailable", f"{provider} orqali kirish hozircha sozlanmagan")


def telegram_check_hash(data: dict[str, Any], bot_token: str) -> str:
    """Telegram hujjatidagi algoritm: data-check-string (hash'siz, kalit bo'yicha tartiblangan
    "kalit=qiymat" qatorlari) → HMAC-SHA256, kalit — SHA256(bot_token).
    """
    check_string = "\n".join(f"{key}={data[key]}" for key in sorted(data) if key != "hash")
    secret = hashlib.sha256(bot_token.encode()).digest()
    return hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()


TELEGRAM_FIELDS = {"id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"}


def verify_telegram(data: dict[str, Any]) -> Profile:
    bot_token = settings.TELEGRAM_BOT_TOKEN
    if not bot_token:
        raise _unavailable("Telegram")
    # Faqat Telegram yuboradigan maydonlar — boshqa maydon qo'shib imzoni chalg'itib bo'lmaydi
    fields = {key: value for key, value in data.items() if key in TELEGRAM_FIELDS}
    received = str(fields.get("hash", ""))
    if not received or "id" not in fields or "auth_date" not in fields:
        raise _invalid()
    if not hmac.compare_digest(telegram_check_hash(fields, bot_token), received):
        raise _invalid()
    try:
        age = time.time() - int(fields["auth_date"])
    except (TypeError, ValueError):
        raise _invalid() from None
    if age > settings.TELEGRAM_AUTH_MAX_AGE or age < -60:
        raise _invalid("Kirish havolasi eskirgan. Qaytadan urinib koʻring.")
    name = " ".join(str(fields[k]) for k in ("first_name", "last_name") if fields.get(k)).strip()
    return Profile(
        provider="telegram",
        uid=str(fields["id"]),
        display_name=(name or str(fields.get("username") or "Telegram"))[:40],
        avatar_url=str(fields.get("photo_url") or "")[:500],
    )


def _google_verify(credential: str, client_id: str) -> dict[str, Any]:
    """Google'ning ochiq kalitlari bilan JWT imzosi, muddati, `aud` va `iss` ni tekshiradi."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    claims: dict[str, Any] = id_token.verify_oauth2_token(  # type: ignore[no-untyped-call]
        credential, google_requests.Request(), client_id
    )
    return claims


def verify_google(credential: str) -> Profile:
    client_id = settings.GOOGLE_CLIENT_ID
    if not client_id:
        raise _unavailable("Google")
    from google.auth.exceptions import TransportError

    try:
        claims = _google_verify(credential, client_id)
    except ValueError:
        raise _invalid() from None
    except TransportError:
        # Google kalitlarini olib bo'lmadi (tarmoq) — 500 emas, tushunarli rad etish
        raise ApiError(
            401, "provider_unavailable", "Google bilan bogʻlanib boʻlmadi. Keyinroq urinib koʻring."
        ) from None
    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"}:
        raise _invalid()
    if not claims.get("email_verified", False):
        raise _invalid("Google akkaunti tasdiqlanmagan")
    # Email saqlanmaydi (maxfiylik siyosati) — faqat Google'dagi doimiy identifikator `sub`
    return Profile(
        provider="google",
        uid=str(claims["sub"]),
        display_name=str(claims.get("name") or claims.get("given_name") or "Google")[:40],
        avatar_url=str(claims.get("picture") or "")[:500],
    )
