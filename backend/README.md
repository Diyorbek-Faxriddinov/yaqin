# Yaqin — backend

Django + Django REST Framework. [API kontrakti](../docs/api/openapi.yaml)ni bajaradi — kontrakt yagona manba, har bir javob testlarda unga qarshi tekshiriladi. Reja — [docs/backend-plan.md](../docs/backend-plan.md), maʼlumot modeli — [docs/backend-data-model.md](../docs/backend-data-model.md), talablar — [docs/backend-handoff.md](../docs/backend-handoff.md).

## Talablar

- Python 3.13
- PostgreSQL 17 + PostGIS 3 (kengaytmalar: `postgis`, `pg_trgm`, `unaccent`)
- Windows'da GeoDjango uchun GDAL va GEOS DLL'lari (PostGIS toʻplamida bor)

## Birinchi sozlash

```bash
# 1. Maʼlumotlar bazasi (bir marta, PostgreSQL superuser sifatida)
psql -U postgres -h localhost -v app_password="'<parol>'" -f scripts/setup-db.sql

# 2. Python muhiti
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt   # Linux/macOS: .venv/bin/python

# 3. Sozlamalar
cp .env.example .env   # DATABASE_PASSWORD va (Windows'da) GDAL/GEOS yoʻllarini kiriting
```

C: diskda joy kam boʻlsa, pip vaqtinchalik fayllarini boshqa diskka yoʻnaltiring: `TMP=D:/tools/tmp TEMP=D:/tools/tmp PIP_CACHE_DIR=D:/tools/pip-cache`.

### Lokal PostgreSQL (portativ, D:\tools)

Ishlab chiqish kompyuterida PostgreSQL oʻrnatuvchisiz, `D:\tools\pgsql` da (maʼlumotlar — `D:\tools\pgdata`). Kompyuter qayta yoqilgandan keyin serverni ishga tushirish kerak:

```powershell
D:\tools\pgsql\bin\pg_ctl.exe -D D:\tools\pgdata -l D:\tools\pgdata\server.log start
D:\tools\pgsql\bin\pg_ctl.exe -D D:\tools\pgdata stop
```

Server faqat `127.0.0.1` da tinglaydi. Superuser va ilova parollari `D:\tools\.pg_*_password` fayllarida (repodan tashqarida).

## Muhit oʻzgaruvchilari

Namuna — [`.env.example`](.env.example). Maxfiy qiymatlar faqat muhitda yoki lokal `.env` da (Git'ga tushmaydi).

| Oʻzgaruvchi                                    | Vazifasi                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `DJANGO_DEBUG`                                 | Ishlab chiqishda `true`; productionda `false`                                |
| `DJANGO_SECRET_KEY`                            | Productionda majburiy (yoʻq boʻlsa ilova ishga tushmaydi)                    |
| `DJANGO_ALLOWED_HOSTS`                         | Ruxsat etilgan domenlar                                                      |
| `DATABASE_*`                                   | PostgreSQL ulanishi                                                          |
| `GDAL_LIBRARY_PATH`, `GEOS_LIBRARY_PATH`       | Faqat Windows (PostGIS toʻplamidagi DLL'lar)                                 |
| `TELEGRAM_BOT_TOKEN`                           | Telegram orqali kirish; boʻsh — oʻchiq (`401 provider_unavailable`)          |
| `GOOGLE_CLIENT_ID`                             | Google orqali kirish; boʻsh — oʻchiq                                         |
| `DEMO_LOGIN_ENABLED`                           | `POST /auth/demo` — faqat `DEBUG` rejimida (standart: `DEBUG` bilan bir xil) |
| `SESSION_COOKIES_SECURE`                       | Cookie'lar faqat HTTPS orqali (standart: `DEBUG` oʻchiq boʻlsa yoqiq)        |
| `FRONTEND_REVALIDATE_URL`, `REVALIDATE_SECRET` | Oʻzgarishdan keyin frontend keshini yangilash webhook'i                      |
| `DJANGO_NUM_PROXIES`                           | Reverse proxy ortida — IP boʻyicha cheklovlar uchun                          |

## Buyruqlar

| Buyruq                                                                        | Vazifasi                                                        |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `python manage.py runserver 8000`                                             | Ishlab chiqish serveri — <http://localhost:8000/api/v1/health>  |
| `waitress-serve --listen=127.0.0.1:8000 --threads=16 config.wsgi:application` | Koʻp oqimli lokal server (frontend build'i backendga ulanganda) |
| `pytest`                                                                      | Testlar (test bazasi avtomatik yaratiladi)                      |
| `ruff check . && ruff format --check .`                                       | Lint va formatlash                                              |
| `mypy .`                                                                      | Tiplar (strict)                                                 |
| `pip-audit -r requirements.txt`                                               | Bogʻliqliklardagi zaifliklar                                    |
| `python manage.py check --deploy`                                             | Production sozlamalari tekshiruvi                               |

## Tuzilma

```text
config/        sozlamalar, URL'lar, WSGI/ASGI; env.py — muhit oʻzgaruvchilari va .env
apps/
  core/        umumiy: health, xato formati, sozlamalar, matn normalizatsiyasi, ish vaqti
  catalog/     tumanlar, kategoriyalar (seed.py — boshlangʻich maʼlumot)
  accounts/    mijozlar: Telegram/Google kirishi, sessiyalar, CSRF, /me
  businesses/  bizneslar, rasmlar, katalog, soʻrovlar
  community/   sharhlar, shikoyatlar, sevimlilar (reyting — services.py)
  stats/       kunlik statistika hodisalari
tests/
  contract.py  javoblarni openapi.yaml ga qarshi tekshirish
  factories.py test maʼlumotlari (tiplangan yordamchilar)
scripts/
  setup-db.sql bazani bir martalik tayyorlash
```

## Kelishuvlar

- Xatolar har doim `{code, message, fields?}` (`apps/core/exceptions.py`); `code` barqaror — frontend unga tayanadi.
- Har bir endpoint testi `assert_matches_contract(response)` ni chaqiradi.
- Kirish talab qiladigan view: `authentication_classes = [CustomerSessionAuthentication]`, `permission_classes = [IsCustomer]`, joriy foydalanuvchi — `customer(request)`. O'zgartiruvchi so'rovlarda CSRF (`X-CSRFToken` = cookie = sessiya) avtomatik tekshiriladi.
- Sessiya va boshqa maxfiy tokenlar bazada faqat SHA-256 xeshi ko'rinishida.
- Ommaviy maʼlumotni o'zgartiradigan amal frontend keshini yangilaydi: `apps.core.revalidate.revalidate(*teglar)` (tranzaksiyadan keyin).
- Kirishsiz va suiisteʼmolga ochiq endpointlar — `ScopedRateThrottle` (stavkalar `settings.REST_FRAMEWORK`).
- Pul — tiyinda butun son, vaqt — ISO 8601, ish vaqti — Asia/Tashkent (ADR-0010).
- Bogʻliqliklar — aniq versiyalar, kamida 2 hafta oldin chiqqan (xavfsizlik tuzatishlari bundan mustasno).
- Maxfiy qiymatlar faqat muhit oʻzgaruvchilarida; `.env` Git'ga tushmaydi.
