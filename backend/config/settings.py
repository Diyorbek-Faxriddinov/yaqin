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

# Foydalanuvchi modellari 3.2–3.5 da qo'shiladi (mijoz va administrator alohida, ADR-0006);
# shuning uchun django.contrib.auth va admin hozircha ulanmagan.
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.gis",
    "rest_framework",
    "apps.core",
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
    # Xatolar kontraktdagi Error sxemasida: {code, message, fields}
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
}

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
