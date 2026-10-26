"""TOTP (2FA) kalitlari: yaratish, shifrlash, QR, kodni tekshirish.

- Kalit bazada Fernet bilan shifrlangan (`TOTP_ENCRYPTION_KEY`): baza sizib chiqsa ham 2FA'ni
  chetlab o'tib bo'lmaydi.
- Bir kodni qayta ishlatib bo'lmaydi: oxirgi qabul qilingan vaqt qadami (`totp_last_step`).
- Soat farqi uchun ±1 qadam (30 soniya) ruxsat etiladi.
"""

import base64
import io
import time

import pyotp
import qrcode  # type: ignore[import-untyped]  # tiplari yo'q (types-qrcode — alohida paket)
import qrcode.image.svg  # type: ignore[import-untyped]
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

ISSUER = "Yaqin"
STEP_SECONDS = 30
VALID_WINDOW = 1


def _fernet() -> Fernet:
    return Fernet(settings.TOTP_ENCRYPTION_KEY)


def new_secret() -> str:
    return pyotp.random_base32()


def encrypt(secret: str) -> str:
    return _fernet().encrypt(secret.encode()).decode()


def decrypt(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except InvalidToken:
        return None


def provisioning_uri(secret: str, username: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=username, issuer_name=ISSUER)


def qr_data_uri(uri: str) -> str:
    """QR — SVG (Pillow kerak emas), `img src` uchun data URI."""
    image = qrcode.make(uri, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=2)
    buffer = io.BytesIO()
    image.save(buffer)
    return "data:image/svg+xml;base64," + base64.b64encode(buffer.getvalue()).decode()


def verify(secret: str, code: str, last_step: int | None, now: float | None = None) -> int | None:
    """To'g'ri va hali ishlatilmagan kod bo'lsa — uning vaqt qadami, aks holda None."""
    if not (len(code) == 6 and code.isdigit()):
        return None
    totp = pyotp.TOTP(secret)
    current = int((now if now is not None else time.time()) // STEP_SECONDS)
    for step in range(current - VALID_WINDOW, current + VALID_WINDOW + 1):
        if last_step is not None and step <= last_step:
            continue
        if pyotp.utils.strings_equal(totp.at(step * STEP_SECONDS), code):
            return step
    return None
