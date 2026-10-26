# Yaqin

**Yaqin** — Toshkentdagi hali onlayn boʻlmagan doʻkonlar, ustalar, salonlar, kafelar va boshqa kundalik xizmatlarni xaritada koʻrsatuvchi platforma. Foydalanuvchi oʻziga eng yaqin xizmatni topadi: narxlar, ish vaqti, manzil va sharhlar bilan. Bizneslarni platforma jamoasi joyida, egasining roziligi bilan qoʻshadi.

> **Holat:** frontend (2-bosqich) tayyor; backend (3-bosqich) ishlab chiqilmoqda — [reja](docs/backend-plan.md). Frontend **demo (mock) maʼlumotlar** bilan ishlaydi — bu har bir sahifada koʻrsatiladi va demo sayt qidiruv tizimlariga yopiq. Batafsil — [docs/progress.md](docs/progress.md).

## Imkoniyatlar

### Mijozlar uchun

- Kategoriyalar, qidiruv (lotin va kirill yozuvida), tuman va "hozir ochiq" filtrlari, masofa boʻyicha saralash
- Xarita (MapLibre + OpenFreeMap), biznes profili, mahsulot va xizmatlar narxlari
- Bogʻlanish: qoʻngʻiroq, Telegram, Yandex/Google xaritada yoʻl
- Telegram yoki Google orqali kirish (demo'da — demo foydalanuvchi): sharhlar, sevimlilar, notoʻgʻri maʼlumot haqida xabar
- "Biznesingizni qoʻshing" soʻrov formasi, "Biz haqimizda", "Aloqa", foydalanish shartlari va maxfiylik siyosati
- Ikki til: oʻzbek (lotin, prefikssiz) va rus (`/ru`)

### Admin panel (telefonga moslashgan, ikki bosqichli kirish)

- Parol + 2FA (TOTP) kirishi; yangi administrator birinchi kirishda vaqtinchalik parolni almashtiradi va autentifikator ilovasini QR orqali ulaydi

- Doʻkonda turib 7 qadamda biznes qoʻshish: GPS, kamera rasmlari (EXIF, jumladan GPS, telefonda ham, serverda ham olib tashlanadi), ish vaqti, narxlar, egasining roziligi
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

⚠ Demo kirish maʼlumotlari faqat mock rejimda ishlaydi. Demo'da Root qoʻshgan administrator birinchi kirishda yangi parol oʻrnatadi va 2FA sozlash oynasini koʻradi (QR oʻrnida belgi, kod baribir `123456`). Demo maʼlumotlar server xotirasida — server qayta ishga tushganda boshlangʻich holatga qaytadi.

## Arxitektura

```text
Brauzer ──► Next.js (SSR, kesh teglari) ──► /api/v1 ──► demo: mock handler'lar (MSW, server ichida)
                                                    └─► production: Django REST API (backend/)
```

- **Kontrakt asosida:** [`docs/api/openapi.yaml`](docs/api/openapi.yaml) — frontend va backend uchun yagona manba; TypeScript tiplari undan generatsiya qilinadi, CI farqni tekshiradi.
- **Mock qatlam** kontraktni toʻliq bajaradi (ruxsatlar, CSRF, tekshiruvlar, audit) — backend uchun ishlaydigan namuna ([ADR-0011](docs/adr/0011-mock-qatlam.md)).
- **Backend** shu kontraktni bajaradi: har bir javob testlarda `openapi.yaml` ga qarshi tekshiriladi ([ADR-0004](docs/adr/0004-backend-steki.md)). Holati — [docs/progress.md](docs/progress.md), maʼlumot modeli — [docs/backend-data-model.md](docs/backend-data-model.md).
- **Xavfsizlik:** httpOnly sessiya + CSRF double-submit, alohida admin sessiyasi (`SameSite=Strict`), admin paroli Argon2 + majburiy 2FA (kalit shifrlangan), IP + login boʻyicha bloklash, har bir endpointda ruxsat tekshiruvi, bazada himoyalangan (faqat qoʻshiladigan) audit jurnali.
- Backend uchun topshiriqlar roʻyxati: [docs/backend-handoff.md](docs/backend-handoff.md).

| Qatlam   | Tanlov                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, next-intl, TanStack Query, React Hook Form + Zod, MapLibre |
| Backend  | Django 5.2 LTS + DRF, PostgreSQL 17 + PostGIS, Redis (kesh), pytest + kontrakt testlari                                                                |
| Infra    | GitHub Actions, Docker Compose, Oʻzbekistondagi hosting (5-bosqich)                                                                                    |

Har bir tanlovning sababi — [docs/adr](docs/adr).

## Sifat

- **Testlar:** frontend — Vitest (unit, mock API xatti-harakati) va Playwright (E2E, 3 ekran: 375 / 768 / 1280 px); backend — pytest (har bir javob API kontraktiga qarshi, maʼlumotlar bazasi cheklovlari, ruxsatlar). Ikkalasi ham har bir push'da CI'da.
- **Sifat vositalari:** ESLint, Prettier, TypeScript (strict); ruff, mypy (strict); `npm audit` va `pip-audit`.
- **Accessibility:** axe (WCAG 2 A/AA) asosiy sahifalarda va admin panelda; klaviatura, ekran oʻquvchi yorliqlari.
- **SEO:** canonical, hreflang (uz/ru), Open Graph rasmi, `sitemap.xml`, `robots.txt`, schema.org (`LocalBusiness`, `WebSite`).
- Lighthouse natijalari va maʼlum cheklovlar — [docs/progress.md](docs/progress.md).

## Repo tuzilmasi

```text
.
├── frontend/              Next.js ilovasi (batafsil: frontend/README.md)
├── backend/               Django ilovasi (batafsil: backend/README.md)
├── docs/
│   ├── api/openapi.yaml   API kontrakti
│   ├── adr/               arxitektura qarorlari
│   ├── backend-handoff.md 3-bosqich uchun topshiriqlar
│   ├── design-system.md   dizayn tizimi
│   └── progress.md        bajarilgan va qolgan ishlar
└── .github/workflows/     CI
```

## Frontend + backend birga (lokal)

Brauzer bitta manzilni ochadi — `http://localhost:8090`. [Caddy](scripts/local/Caddyfile) `/api/v1` soʻrovlarini (rasmlar ham) Django'ga, qolganini Next.js'ga yoʻnaltiradi — productiondagi tartib bilan bir xil.

**Bir martalik sozlash:**

1. PostgreSQL + PostGIS va backend muhiti — [backend/README.md](backend/README.md) dagi "Birinchi sozlash".
2. Caddy — [rasmiy relizdan](https://github.com/caddyserver/caddy/releases) `caddy_<versiya>_windows_amd64.zip`, ichidagi `caddy.exe` → `D:\tools\caddy\caddy.exe`.
3. `backend/.env` ga: `DJANGO_ALLOWED_ORIGINS` (`http://localhost:8090` bilan), `DJANGO_NUM_PROXIES=1`, `FRONTEND_REVALIDATE_URL=http://127.0.0.1:3000/api/revalidate`, `REVALIDATE_SECRET`; `frontend/.env.local` ga — xuddi shu `REVALIDATE_SECRET` (admin oʻzgarishlari saytda darhol koʻrinishi uchun).
4. Birinchi administrator (Root) — faqat serverda:

   ```powershell
   cd backend
   .venv\Scripts\python manage.py createroot --username root --display-name "Bosh administrator"
   ```

**Ishga tushirish** (PostgreSQL ishlamayotgan boʻlsa, uni ham yoqadi; uchta oyna ochiladi — toʻxtatish uchun yoping):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\local\start.ps1
```

Keyin `http://localhost:8090/admin` → login va parol → telefondagi autentifikator ilovasi (Google Authenticator, Aegis…) bilan QR'ni skanerlang → kod. Bizneslarni admin panelda qoʻshasiz — eʼlon qilingach saytda paydo boʻladi.

Bu rejimda hali ishlamaydi (4-bosqich): mijozning Telegram/Google orqali kirishi (bot va Google client ID kerak), shuning uchun sevimlilar, sharh va shikoyat yozish ham. Demo rejim (`npm run dev`, `http://localhost:3000`) avvalgidek ishlaydi.

## Tekshiruvlar

```bash
cd frontend
npm run check                # lint + typecheck + format + unit testlar
npm run build && npm run e2e # E2E (birinchi marta: npx playwright install chromium)

cd ../backend
ruff check . && ruff format --check . && mypy . && pytest
```

## Xavfsizlik

- Maxfiy kalitlar va parollar repoga **hech qachon** qoʻshilmaydi — faqat `.env.example` namunalari.
- Doʻkonlardan yigʻilgan real maʼlumotlar repoda saqlanmaydi.
- Ruxsatlar backendda tekshiriladi; interfeysdagi yashirish xavfsizlik chorasi hisoblanmaydi ([ADR-0009](docs/adr/0009-ruxsatlar-modeli.md)).
