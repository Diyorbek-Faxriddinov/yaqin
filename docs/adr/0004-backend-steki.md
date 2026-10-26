# 0004. Backend steki

- **Holat:** Qabul qilingan; 2026-10-26 da yangilangan (OpenAPI manbasi)
- **Sana:** 2026-10-25

## Kontekst

Asosiy vazifalar: geo-qidiruv ("eng yaqin"), kategoriyaga qarab oʻzgaruvchan atributlar, granular ruxsatlar, audit, moderatsiya, fon vazifalari (rasmlarni qayta ishlash, bildirishnomalar). Muallif Python va TypeScript'ni biladi.

## Qaror

- **Django 5.2 LTS + Django REST Framework**. OpenAPI — **qoʻlda yoziladigan kontrakt** (`docs/api/openapi.yaml`) yagona manba; backend javoblari testlarda unga qarshi tekshiriladi (`openapi-core`).
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

## Yangilanish (2026-10-26): OpenAPI manbasi

Dastlab sxemani koddan generatsiya qilish (`drf-spectacular`) rejalashtirilgan edi. 2-bosqichda frontend kontrakt asosida qurildi: `openapi.yaml` dan TypeScript tiplari va kontraktni toʻliq bajaradigan mock qatlam. Endi manbani koddan generatsiyaga oʻtkazish frontend tiplarini beqaror qiladi.

Qaror: kontrakt qoʻlda yoziladi va manba boʻlib qoladi; backend unga moslashadi. Har bir endpoint testi javobni kontraktga qarshi tekshiradi — kod va hujjat bir-biridan uzoqlashsa, test yiqiladi. CI ikkala tomonda: frontend tiplari kontraktdan, backend javoblari kontraktga.
