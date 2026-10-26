"""Yaqin backend sozlamalari. Maxfiy va muhitga bog'liq qiymatlar — muhit o'zgaruvchilaridan."""

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

# Mijoz (accounts.User) va administrator (3.5) — alohida modellar, alohida sessiyalar (ADR-0006).
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
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
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
MEDIA_URL = "/media/"

LANGUAGE_CODE = "uz"
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

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
    # Kirishsiz endpointlar uchun IP bo'yicha cheklov (handoff, 2-bo'lim)
    "DEFAULT_THROTTLE_RATES": {
        "events": "120/min",
        "business_requests": "5/hour",
        "auth": "20/min",
        # Kirgan foydalanuvchi bo'yicha (ScopedRateThrottle foydalanuvchi ID'sini ishlatadi)
        "reviews": "10/hour",
        "complaints": "10/hour",
    },
    # Reverse proxy (Caddy/Nginx) ortida: X-Forwarded-For'dan nechta proksi ishonchli
    "NUM_PROXIES": int(env_str("DJANGO_NUM_PROXIES", "0")) or None,
    # Xatolar kontraktdagi Error sxemasida: {code, message, fields}
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
}

# --- Mijoz kirishi (ADR-0006, ADR-0012) ---
# Telegram Login Widget: @BotFather'dan bot tokeni; bo'sh — Telegram orqali kirish o'chiq
TELEGRAM_BOT_TOKEN = env_str("TELEGRAM_BOT_TOKEN")
TELEGRAM_AUTH_MAX_AGE = 24 * 60 * 60  # auth_date necha soniyagacha amal qiladi
# Google Identity Services: OAuth mijoz ID'si; bo'sh — Google orqali kirish o'chiq
GOOGLE_CLIENT_ID = env_str("GOOGLE_CLIENT_ID")
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

# --- Frontend keshini yangilash (docs/backend-handoff.md, 6-bo'lim) ---
FRONTEND_REVALIDATE_URL = env_str("FRONTEND_REVALIDATE_URL")
REVALIDATE_SECRET = env_str("REVALIDATE_SECRET")

# Kesh (cheklovlar hisoblagichlari): ishlab chiqishda — xotirada; productionda Redis (3.8)
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# Xavfsizlik sarlavhalari (HTTPS va cookie sozlamalari productionda — 3.8)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

# API kontrakti — testlar javoblarni shu faylga qarshi tekshiradi
OPENAPI_CONTRACT = REPO_DIR / "docs" / "api" / "openapi.yaml"
