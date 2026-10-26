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

### Lokal PostgreSQL (portativ, D:\tools)

Ishlab chiqish kompyuterida PostgreSQL oʻrnatuvchisiz, `D:\tools\pgsql` da (maʼlumotlar — `D:\tools\pgdata`). Kompyuter qayta yoqilgandan keyin serverni ishga tushirish kerak:

```powershell
D:\tools\pgsql\bin\pg_ctl.exe -D D:\tools\pgdata -l D:\tools\pgdata\server.log start
D:\tools\pgsql\bin\pg_ctl.exe -D D:\tools\pgdata stop
```

Server faqat `127.0.0.1` da tinglaydi. Superuser va ilova parollari `D:\tools\.pg_*_password` fayllarida (repodan tashqarida).

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
  accounts/    mijozlar
  businesses/  bizneslar, rasmlar, katalog, soʻrovlar
  community/   sharhlar, shikoyatlar, sevimlilar
  stats/       kunlik statistika hodisalari
tests/
  contract.py  javoblarni openapi.yaml ga qarshi tekshirish
scripts/
  setup-db.sql bazani bir martalik tayyorlash
```

## Kelishuvlar

- Xatolar har doim `{code, message, fields?}` (`apps/core/exceptions.py`); `code` barqaror — frontend unga tayanadi.
- Har bir endpoint testi `assert_matches_contract(response)` ni chaqiradi.
- Pul — tiyinda butun son, vaqt — ISO 8601, ish vaqti — Asia/Tashkent (ADR-0010).
- Bogʻliqliklar — aniq versiyalar, kamida 2 hafta oldin chiqqan (xavfsizlik tuzatishlari bundan mustasno).
- Maxfiy qiymatlar faqat muhit oʻzgaruvchilarida; `.env` Git'ga tushmaydi.
