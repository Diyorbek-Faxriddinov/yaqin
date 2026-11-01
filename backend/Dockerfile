# Production image: Django + gunicorn (deploy/compose.yaml). Lokal ishlab chiqishda kerak emas.
FROM python:3.13-slim-trixie

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# GeoDjango: GDAL va GEOS tizim kutubxonalari (gdal-bin ikkalasini ham olib keladi)
RUN apt-get update \
    && apt-get install -y --no-install-recommends gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

# Ilova root huquqisiz ishlaydi; rasmlar papkasi (volume) shu foydalanuvchiga tegishli
RUN useradd --uid 10001 --create-home app && mkdir -p /app/media && chown app:app /app/media
COPY --chown=app:app . .
USER app

EXPOSE 8000
# Kirish logi yozilmaydi: so'rov manzilida joylashuv (lat/lng) bo'lishi mumkin (maxfiylik siyosati)
# X-Forwarded-* ga ishoniladi: backend faqat ichki Docker tarmog'ida (Caddy va frontend orqali)
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "30", \
     "--graceful-timeout", "20", \
     "--forwarded-allow-ips", "*"]
