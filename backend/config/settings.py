"""Yaqin backend sozlamalari. Maxfiy va muhitga bog'liq qiymatlar — muhit o'zgaruvchilaridan."""

import re
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from config.env import env_bool, env_list, env_str, load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BASE_DIR.parent
load_dotenv(BASE_DIR / ".env")

DEBUG = env_bool("DJANGO_DEBUG")
SECRET_KEY = env_str("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_SECRET_KEY majburiy (productionda)")
    SECRET_KEY = "dev-only-insecure-key"  # noqa: S105 — faqat DEBUG rejimida

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

# GeoDjango Windows'da: PostGIS to'plamidagi DLL'lar (Linux'da tizim kutubxonalari topiladi)
if env_str("GDAL_LIBRARY_PATH"):
    GDAL_LIBRARY_PATH = env_str("GDAL_LIBRARY_PATH")
if env_str("GEOS_LIBRARY_PATH"):
    GEOS_LIBRARY_PATH = env_str("GEOS_LIBRARY_PATH")

# Mijoz (accounts.User) va admin (staff.AdminUser) — alohida modellar va sessiyalar (ADR-0006).
# django.contrib.auth/admin ishlatilmaydi: o'z admin panelimiz va RBAC (ADR-0009).
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.postgres",
    "django.contrib.gis",
    "rest_framework",
    "apps.core",
    "apps.catalog",
    "apps.accounts",
    "apps.businesses",
    "apps.community",
    "apps.stats",
    "apps.staff",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.OriginCheckMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "HOST": env_str("DATABASE_HOST", "localhost"),
        "PORT": env_str("DATABASE_PORT", "5432"),
        "NAME": env_str("DATABASE_NAME", "yaqin"),
        "USER": env_str("DATABASE_USER", "yaqin"),
        "PASSWORD": env_str("DATABASE_PASSWORD"),
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Yuklangan fayllar (rasmlar) — ishlab chiqishda diskda; productionda S3-mos xotira (3.6, ADR-0004)
MEDIA_ROOT = BASE_DIR / "media"
MEDIA_URL = "/api/v1/media/"

LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

# Kirishsiz endpointlar uchun IP bo'yicha cheklov (handoff, 2-bo'lim)
THROTTLE_RATES: dict[str, str] = {
    "events": "120/min",
    "business_requests": "5/hour",
    "auth": "20/min",
    # Kirgan foydalanuvchi bo'yicha (ScopedRateThrottle foydalanuvchi ID'sini ishlatadi)
    "reviews": "10/hour",
    "complaints": "10/hour",
    # Admin kirishi (login, setup, 2fa) — IP bo'yicha; qo'shimcha IP + login bloklash —
    # apps/staff/lockout.py
    "admin_auth": "30/min",
    # Hisobot havolasi — tokenni tanlab topishga qarshi (to'g'ri havola egasi uchun yetarli)
    "reports": "30/min",
}

REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    # Autentifikatsiya 3.4–3.5 da (o'z sessiyalarimiz); hozircha hech kim tanilmaydi
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_THROTTLE_RATES": THROTTLE_RATES,
    # Reverse proxy (Caddy/Nginx) ortida: X-Forwarded-For'dan nechta proksi ishonchli
    "NUM_PROXIES": int(env_str("DJANGO_NUM_PROXIES", "0")) or None,
    # Xatolar kontraktdagi Error sxemasida: {code, message, fields}
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
}

# E2E testlar uchun (barcha so'rovlar bitta IP'dan): "auth=1000/min,business_requests=1000/hour".
# Faqat DEBUG rejimida — productionda cheklovlarni muhit orqali bo'shatib bo'lmaydi.
if env_str("DJANGO_THROTTLE_OVERRIDES"):
    if not DEBUG:
        raise ImproperlyConfigured("DJANGO_THROTTLE_OVERRIDES faqat DEBUG rejimida")
    for pair in env_list("DJANGO_THROTTLE_OVERRIDES", ""):
        scope, _, rate = pair.partition("=")
        if scope not in THROTTLE_RATES or not rate:
            raise ImproperlyConfigured(f"Notoʻgʻri DJANGO_THROTTLE_OVERRIDES: {pair}")
        THROTTLE_RATES[scope] = rate

# --- Mijoz kirishi (ADR-0006, ADR-0012) ---
# Telegram Login Widget: @BotFather'dan bot tokeni; bo'sh — Telegram orqali kirish o'chiq
TELEGRAM_BOT_TOKEN = env_str("TELEGRAM_BOT_TOKEN")
TELEGRAM_AUTH_MAX_AGE = 24 * 60 * 60  # auth_date necha soniyagacha amal qiladi
# Google Identity Services: OAuth mijoz ID'si; bo'sh — Google orqali kirish o'chiq
GOOGLE_CLIENT_ID = env_str("GOOGLE_CLIENT_ID")
# Nusxalashdagi xato (https://, bo'shliq, token o'rniga boshqa qiymat) jimgina "kirib bo'lmadi"ga
# aylanmasin — ilova darhol aniq sabab bilan to'xtaydi
if TELEGRAM_BOT_TOKEN and not re.fullmatch(r"\d+:[A-Za-z0-9_-]+", TELEGRAM_BOT_TOKEN):
    raise ImproperlyConfigured(
        "TELEGRAM_BOT_TOKEN formati: 123456789:AA... (@BotFather bergan token)"
    )
if GOOGLE_CLIENT_ID and not re.fullmatch(
    r"[a-z0-9-]+\.apps\.googleusercontent\.com", GOOGLE_CLIENT_ID
):
    raise ImproperlyConfigured(
        "GOOGLE_CLIENT_ID formati: <raqam>-<...>.apps.googleusercontent.com (https:// siz)"
    )
# Demo kirish (POST /auth/demo) — faqat ishlab chiqish va integratsiya sinovlari
DEMO_LOGIN_ENABLED = env_bool("DEMO_LOGIN_ENABLED", DEBUG)
if DEMO_LOGIN_ENABLED and not DEBUG:
    raise ImproperlyConfigured("DEMO_LOGIN_ENABLED faqat DEBUG rejimida")
# Cookie'lar faqat HTTPS orqali (productionda); lokal HTTP ishlab chiqishda o'chiq
SESSION_COOKIES_SECURE = env_bool("SESSION_COOKIES_SECURE", not DEBUG)
# CSRF — o'zimizning double-submit tekshiruvimiz (sessiyaga bog'langan,
# apps/accounts/authentication.py); Django CsrfViewMiddleware ishlatilmaydi —
# DRF APIView'lar baribir uni chetlab o'tadi
SILENCED_SYSTEM_CHECKS = ["security.W003"]

# --- Administratorlar (ADR-0006, ADR-0009) ---
# Parollar — Argon2 (Django hashers; django.contrib.auth ilovasi kerak emas)
PASSWORD_HASHERS = ["django.contrib.auth.hashers.Argon2PasswordHasher"]
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
        "OPTIONS": {"user_attributes": ("username", "display_name")},
    },
]
# TOTP kalitlarini shifrlash (Fernet). Yaratish:
# python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
TOTP_ENCRYPTION_KEY = env_str("TOTP_ENCRYPTION_KEY")
if not TOTP_ENCRYPTION_KEY:
    if not DEBUG:
        raise ImproperlyConfigured("TOTP_ENCRYPTION_KEY majburiy (productionda)")
    TOTP_ENCRYPTION_KEY = "ZGV2LW9ubHktaW5zZWN1cmUtdG90cC1rZXktMzJieXQ="  # faqat DEBUG

# --- Frontend keshini yangilash (docs/backend-handoff.md, 6-bo'lim) ---
FRONTEND_REVALIDATE_URL = env_str("FRONTEND_REVALIDATE_URL")
REVALIDATE_SECRET = env_str("REVALIDATE_SECRET")

# Kesh (cheklov va bloklash hisoblagichlari): productionda Redis — barcha jarayonlar uchun umumiy;
# ishlab chiqish va testlarda — jarayon xotirasi. Redis yo'q bo'lsa `check --deploy` ogohlantiradi.
REDIS_URL = env_str("REDIS_URL")
CACHES = {
    "default": (
        {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": REDIS_URL}
        if REDIS_URL
        else {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
    )
}

# O'zgartiruvchi API so'rovlari faqat shu saytlardan (`Origin` sarlavhasi, apps/core/middleware.py)
ALLOWED_ORIGINS = env_list("DJANGO_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

# Xavfsizlik sarlavhalari
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
# HTTPS reverse proxy (Caddy/Nginx) ortida: proksi X-Forwarded-Proto ni o'rnatadi
if env_bool("DJANGO_BEHIND_HTTPS_PROXY"):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env_bool("DJANGO_SSL_REDIRECT")
# HSTS — HTTPS to'liq ishlashi tasdiqlangandan keyingina (5-bosqich, 31536000): yoqilgach brauzerlar
# saytni HTTP orqali ochmaydi, xato sozlamani tezda qaytarib bo'lmaydi
SECURE_HSTS_SECONDS = int(env_str("DJANGO_HSTS_SECONDS", "0"))
# Subdomenlar va preload ro'yxati — domen tanlangach (5-bosqich), barcha subdomenlar HTTPS bo'lsa
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_HSTS_INCLUDE_SUBDOMAINS")
SECURE_HSTS_PRELOAD = env_bool("DJANGO_HSTS_PRELOAD")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    # Query string loglanmaydi — unda joylashuv (lat/lng) bo'lishi mumkin (maxfiylik siyosati)
    "filters": {"strip_query": {"()": "apps.core.logging.StripQueryStringFilter"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "filters": ["strip_query"]}},
    # Django'ning standart "django" handler'lari o'rniga bizniki — xabarlar ikki marta yozilmaydi
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "django.server": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
}

# API kontrakti — testlar javoblarni shu faylga qarshi tekshiradi
OPENAPI_CONTRACT = REPO_DIR / "docs" / "api" / "openapi.yaml"
