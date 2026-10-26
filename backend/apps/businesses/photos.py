"""Yuklangan rasmlarni tekshirish va qayta kodlash (handoff: rasmlar bo'limi).

- Faqat JPEG, PNG, WebP — fayl mazmuni bo'yicha (kengaytma yoki Content-Type'ga ishonilmaydi);
  boshqa formatlarning dekoderlari umuman chaqirilmaydi.
- Ko'pi bilan 5 MB va 40 megapiksel; kichik tomoni kamida 200 px.
- Har doim qayta kodlanadi (WebP): EXIF, jumladan GPS, va boshqa metamaʼlumotlar tushib qoladi;
  rang profili (ICC) qoladi; burilish (EXIF Orientation) piksellarga qo'llanadi;
  uzun tomoni 2000 px gacha kichraytiriladi.
"""

import io
from dataclasses import dataclass

from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps, UnidentifiedImageError

from apps.core.api import ApiError

MAX_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 40_000_000
MIN_SIDE = 200
MAX_SIDE = 2000
ALLOWED_FORMATS = ("JPEG", "PNG", "WEBP")
WEBP_QUALITY = 82


@dataclass(frozen=True)
class ProcessedPhoto:
    content: bytes
    width: int
    height: int


def _invalid(message: str) -> ApiError:
    return ApiError(400, "validation_error", "Rasm qabul qilinmadi", {"file": [message]})


def process_photo(upload: UploadedFile) -> ProcessedPhoto:
    if upload.size is not None and upload.size > MAX_BYTES:
        raise ApiError(413, "file_too_large", "Fayl 5 MB dan katta")
    try:
        with Image.open(upload, formats=ALLOWED_FORMATS) as source:
            width, height = source.size
            if width * height > MAX_PIXELS:
                raise _invalid("Rasm juda katta (40 megapikseldan oshmasin)")
            if min(width, height) < MIN_SIDE:
                raise _invalid(f"Rasm juda kichik (kamida {MIN_SIDE} px)")
            # Animatsiyali GIF/WebP/APNG — faqat birinchi kadr
            source.seek(0)
            # Rang profili shaxsiy maʼlumot emas — saqlanadi (telefonlardagi P3 ranglar buzilmasin)
            icc_profile = source.info.get("icc_profile")
            image = ImageOps.exif_transpose(source)
            image.load()
    except UnidentifiedImageError as error:
        raise _invalid("Faqat JPEG, PNG yoki WebP") from error
    except (OSError, ValueError, Image.DecompressionBombError) as error:
        raise _invalid("Rasm fayli buzilgan") from error

    has_alpha = image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info)
    image = image.convert("RGBA" if has_alpha else "RGB")
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    # exif berilmaydi — EXIF/GPS va boshqa metamaʼlumotlarsiz saqlanadi
    image.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=4, icc_profile=icc_profile)
    return ProcessedPhoto(buffer.getvalue(), image.width, image.height)
