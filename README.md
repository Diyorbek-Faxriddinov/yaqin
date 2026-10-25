# Yaqin

**Yaqin** — Toshkentdagi hali onlayn boʻlmagan doʻkonlar, ustalar, salonlar, kafelar va boshqa kundalik xizmatlarni xaritada koʻrsatuvchi platforma. Foydalanuvchi oʻziga eng yaqin xizmatni topadi: narxlar, ish vaqti, manzil va sharhlar bilan.

> **Holat:** 2-bosqich — frontend ishlab chiqilmoqda. Backend hali mavjud emas; frontend vaqtincha **demo (mock) maʼlumotlar** bilan ishlaydi va bu interfeysda aniq koʻrsatiladi. Batafsil — [docs/progress.md](docs/progress.md).

## Asosiy imkoniyatlar (MVP)

- Kategoriyalar, qidiruv (lotin va kirill yozuvida), filtrlar, masofa boʻyicha saralash
- Xarita koʻrinishi, biznes profili, mahsulot va xizmatlar narxlari bilan
- Bogʻlanish tugmalari: qoʻngʻiroq, Telegram, Yandex/Google xaritada yoʻl
- Sharhlar, sevimlilar, shikoyatlar (Telegram yoki Google orqali kirgan foydalanuvchilar uchun)
- Admin panel: bizneslarni joyida, telefondan tez qoʻshish; kategoriyalar, moderatsiya, granular ruxsatlar, audit jurnali
- Bizneslar uchun koʻrishlar va bosishlar statistikasi

MVP doirasi va undan tashqarida qolgan imkoniyatlar: [ADR-0008](docs/adr/0008-mvp-doirasi.md).

## Texnologiyalar

| Qatlam   | Tanlov                                                                             |
| -------- | ---------------------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, next-intl, Vitest, Playwright |
| Backend  | Django + Django REST Framework, PostgreSQL + PostGIS, Redis, Celery (3-bosqich)    |
| Infra    | GitHub Actions, Docker Compose, Oʻzbekistondagi hosting (5-bosqich)                |

Har bir tanlovning sababi — [docs/adr](docs/adr).

## Repo tuzilmasi

```text
.
├── frontend/        Next.js ilovasi
├── backend/         Django ilovasi (3-bosqichda qoʻshiladi)
├── docs/
│   ├── adr/         arxitektura qarorlari
│   └── progress.md  bajarilgan va qolgan ishlar
└── .github/workflows/  CI
```

## Ishga tushirish

Talablar: **Node.js 20.9+** (tavsiya: 24), npm.

```bash
cd frontend
npm install
cp .env.example .env.local   # qiymatlarni kerak boʻlsa oʻzgartiring
npm run dev                  # http://localhost:3000
```

Tekshiruvlar:

```bash
npm run check                # lint + typecheck + format + unit testlar
npm run build && npm run e2e # E2E testlar (birinchi marta: npx playwright install chromium)
```

## Xavfsizlik

- Maxfiy kalitlar va parollar repoga **hech qachon** qoʻshilmaydi — faqat `.env.example` namunalari.
- Doʻkonlardan yigʻilgan real maʼlumotlar repoda saqlanmaydi.
- Ruxsatlar backendda tekshiriladi; interfeysdagi yashirish xavfsizlik chorasi hisoblanmaydi ([ADR-0009](docs/adr/0009-ruxsatlar-modeli.md)).
