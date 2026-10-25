# 0004. Backend steki

- **Holat:** Qabul qilingan (amalga oshirish — 3-bosqich)
- **Sana:** 2026-10-25

## Kontekst

Asosiy vazifalar: geo-qidiruv ("eng yaqin"), kategoriyaga qarab oʻzgaruvchan atributlar, granular ruxsatlar, audit, moderatsiya, fon vazifalari (rasmlarni qayta ishlash, bildirishnomalar). Muallif Python va TypeScript'ni biladi.

## Qaror

- **Django + Django REST Framework**, OpenAPI — `drf-spectacular`.
- **PostgreSQL + PostGIS** — geo-soʻrovlar; **JSONB** — kategoriya atributlari; **pg_trgm** — imlo xatolariga chidamli qidiruv.
- **Redis** — kesh, rate limiting, navbat; **Celery** — fon vazifalari.
- Fayllar — S3-mos obyekt saqlash (Oʻzbekistonda).
- Testlar — pytest-django + factory_boy, har bir endpoint uchun ruxsatlar matritsasi testlari.

## Koʻrib chiqilgan muqobillar

- **NestJS** — frontend bilan bir til, lekin PostGIS bilan ishlash va xavfsizlik sozlamalari koʻproq qoʻl mehnati talab qiladi.
- **Laravel** — tez, lekin geo va murakkab ruxsatlar uchun zaifroq.
- **FastAPI** — admin, auth, migratsiyalarni oʻzimiz yigʻishimiz kerak.
- **MySQL** — muallifga tanish, lekin PostGIS, JSONB va pg_trgm ning toʻliq muqobili yoʻq.

## Oqibatlar

- Frontend va backend ikki xil tilda; tiplar OpenAPI orqali sinxronlanadi.
- Django'ning xavfsiz standartlari (CSRF, ORM, parol xeshlash) tayyor holda olinadi.
