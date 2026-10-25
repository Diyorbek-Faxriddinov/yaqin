# Yaqin

**Yaqin** — Toshkentdagi hali onlayn boʻlmagan doʻkonlar, ustalar, salonlar, kafelar va boshqa kundalik xizmatlarni xaritada koʻrsatuvchi platforma. Foydalanuvchi oʻziga eng yaqin xizmatni topadi: narxlar, ish vaqti, manzil va sharhlar bilan. Bizneslarni platforma jamoasi joyida, egasining roziligi bilan qoʻshadi.

> **Holat:** frontend (2-bosqich) tayyor; backend (3-bosqich) hali yoʻq. Frontend **demo (mock) maʼlumotlar** bilan ishlaydi — bu har bir sahifada koʻrsatiladi va demo sayt qidiruv tizimlariga yopiq. Batafsil — [docs/progress.md](docs/progress.md).

## Imkoniyatlar

### Mijozlar uchun

- Kategoriyalar, qidiruv (lotin va kirill yozuvida), tuman va "hozir ochiq" filtrlari, masofa boʻyicha saralash
- Xarita (MapLibre + OpenFreeMap), biznes profili, mahsulot va xizmatlar narxlari
- Bogʻlanish: qoʻngʻiroq, Telegram, Yandex/Google xaritada yoʻl
- Telegram yoki Google orqali kirish (demo'da — demo foydalanuvchi): sharhlar, sevimlilar, notoʻgʻri maʼlumot haqida xabar
- "Biznesingizni qoʻshing" soʻrov formasi, "Biz haqimizda", "Aloqa", foydalanish shartlari va maxfiylik siyosati
- Ikki til: oʻzbek (lotin, prefikssiz) va rus (`/ru`)

### Admin panel (telefonga moslashgan, ikki bosqichli kirish)

- Doʻkonda turib 7 qadamda biznes qoʻshish: GPS, kamera rasmlari (EXIF olib tashlanadi), ish vaqti, narxlar, egasining roziligi
- Soʻrovlar, sharhlar moderatsiyasi, shikoyatlar, kategoriyalar va atributlar, foydalanuvchilarni bloklash
- Administratorlar, rollar va granular ruxsatlar (manbasi bilan), audit jurnali, sozlamalar
- Statistika (koʻrishlar va bosishlar) va biznes egasi uchun maxfiy hisobot havolasi

MVP doirasi: [ADR-0008](docs/adr/0008-mvp-doirasi.md).

## Demo'ni koʻrish

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                  # http://localhost:3000
```

| Kirish             | Maʼlumot                                                      |
| ------------------ | ------------------------------------------------------------- |
| Mijoz              | `/kirish` → "Demo foydalanuvchi sifatida kirish"              |
| Admin (Root)       | `/admin` → login `root`, parol `yaqin-demo`, kod `123456`     |
| Admin (cheklangan) | login `moderator` — ruxsatlar qanday ishlashini koʻrish uchun |

⚠ Demo kirish maʼlumotlari faqat mock rejimda ishlaydi. Demo maʼlumotlar server xotirasida — server qayta ishga tushganda boshlangʻich holatga qaytadi.

## Arxitektura

```text
Brauzer ──► Next.js (SSR, kesh teglari) ──► /api/v1 ──► demo: mock handler'lar (MSW, server ichida)
                                                    └─► production: Django REST API (3-bosqich)
```

- **Kontrakt asosida:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml) — frontend va backend uchun yagona manba; TypeScript tiplari undan generatsiya qilinadi, CI farqni tekshiradi.
- **Mock qatlam** kontraktni toʻliq bajaradi (ruxsatlar, CSRF, tekshiruvlar, audit) — backend uchun ishlaydigan namuna ([ADR-0011](docs/adr/0011-mock-qatlam.md)).
- **Xavfsizlik:** httpOnly sessiya + CSRF double-submit, alohida admin sessiyasi (`SameSite=Strict`), har bir endpointda ruxsat tekshiruvi, faqat qoʻshiladigan audit jurnali.
- Backend uchun topshiriqlar roʻyxati: [docs/backend-handoff.md](docs/backend-handoff.md).

| Qatlam   | Tanlov                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, next-intl, TanStack Query, React Hook Form + Zod, MapLibre |
| Backend  | Django + DRF, PostgreSQL + PostGIS, Redis, Celery (3-bosqich)                                                                                          |
| Infra    | GitHub Actions, Docker Compose, Oʻzbekistondagi hosting (5-bosqich)                                                                                    |

Har bir tanlovning sababi — [docs/adr](docs/adr).

## Sifat

- **Testlar:** Vitest (unit, mock API xatti-harakati) va Playwright (E2E, 3 ekran: 375 / 768 / 1280 px) — har bir push'da CI'da.
- **Accessibility:** axe (WCAG 2 A/AA) asosiy sahifalarda va admin panelda; klaviatura, ekran oʻquvchi yorliqlari.
- **SEO:** canonical, hreflang (uz/ru), Open Graph rasmi, `sitemap.xml`, `robots.txt`, schema.org (`LocalBusiness`, `WebSite`).
- Lighthouse natijalari va maʼlum cheklovlar — [docs/progress.md](docs/progress.md).

## Repo tuzilmasi

```text
.
├── frontend/              Next.js ilovasi (batafsil: frontend/README.md)
├── backend/               Django ilovasi (3-bosqichda qoʻshiladi)
├── docs/
│   ├── api/openapi.yaml   API kontrakti
│   ├── adr/               arxitektura qarorlari
│   ├── backend-handoff.md 3-bosqich uchun topshiriqlar
│   ├── design-system.md   dizayn tizimi
│   └── progress.md        bajarilgan va qolgan ishlar
└── .github/workflows/     CI
```

## Tekshiruvlar

```bash
cd frontend
npm run check                # lint + typecheck + format + unit testlar
npm run build && npm run e2e # E2E (birinchi marta: npx playwright install chromium)
```

## Xavfsizlik

- Maxfiy kalitlar va parollar repoga **hech qachon** qoʻshilmaydi — faqat `.env.example` namunalari.
- Doʻkonlardan yigʻilgan real maʼlumotlar repoda saqlanmaydi.
- Ruxsatlar backendda tekshiriladi; interfeysdagi yashirish xavfsizlik chorasi hisoblanmaydi ([ADR-0009](docs/adr/0009-ruxsatlar-modeli.md)).
