# Yaqin

**Yaqin** — Toshkentdagi hali onlayn boʻlmagan doʻkonlar, ustalar, salonlar, kafelar va boshqa kundalik xizmatlarni xaritada koʻrsatuvchi platforma. Foydalanuvchi oʻziga eng yaqin xizmatni topadi: narxlar, ish vaqti, manzil va sharhlar bilan. Bizneslarni platforma jamoasi joyida, egasining roziligi bilan qoʻshadi.

> **Holat:** frontend, backend va ularning integratsiyasi (2–4-bosqichlar) tayyor; hozir — hosting (5-bosqich: Servercore, `yaqinapp.uz`; tuzilma — [docs/deployment.md](docs/deployment.md)). Standart holatda frontend **demo (mock) maʼlumotlar** bilan ishlaydi (backend bilan — pastdagi "Frontend + backend birga") — demo har bir sahifada koʻrsatiladi va demo sayt qidiruv tizimlariga yopiq. Batafsil — [docs/progress.md](docs/progress.md).

## Imkoniyatlar

### Mijozlar uchun

- Kategoriyalar, qidiruv (lotin va kirill yozuvida; mahsulot nomi boʻyicha ham — natijada nima uchun topilgani), tuman va "hozir ochiq" filtrlari, masofa boʻyicha saralash
- Xarita (MapLibre + OpenFreeMap), biznes profili: rasmlar galereyasi (rasm kesilmaydi), doʻkonda — rasmli mahsulot kartochkalari, xizmatlarda — narx roʻyxati; mahsulot sahifasi rasmlar, tavsif va xususiyatlar bilan (rus tilida ham)
- Bogʻlanish: qoʻngʻiroq, Telegram, Yandex/Google xaritada yoʻl; barcha telefonlar, Instagram va veb-sayt
- Biznes qulayliklari: karta va Payme/Click orqali toʻlov, yetkazib berish, toʻxtash joyi, Wi-Fi, namozxona va boshqalar
- Telegram yoki Google orqali kirish (demo'da — demo foydalanuvchi): sharhlar, sevimlilar, notoʻgʻri maʼlumot haqida xabar
- "Biznesingizni qoʻshing" soʻrov formasi, "Biz haqimizda", "Aloqa", foydalanish shartlari va maxfiylik siyosati
- Ikki til: oʻzbek (lotin, prefikssiz) va rus (`/ru`)

### Admin panel (telefonga moslashgan, ikki bosqichli kirish)

- Parol + 2FA (TOTP) kirishi; yangi administrator birinchi kirishda vaqtinchalik parolni almashtiradi va autentifikator ilovasini QR orqali ulaydi

- Doʻkonda turib 7 qadamda biznes qoʻshish: GPS, kamera rasmlari (EXIF, jumladan GPS, telefonda ham, serverda ham olib tashlanadi), ish vaqti, katalog, egasining roziligi
- Katalog: mahsulot va xizmatlar rasmlari (5 tagacha), tavsifi, kategoriya xususiyatlari turiga mos maydonlar bilan (oʻlchamlar — tugmachalar, son — birligi bilan), boʻlim takliflari; 46 kategoriya uchun tayyor standart xususiyatlar ([ADR-0014](docs/adr/0014-dokon-katalogi.md))
- Eʼlon qilish va saytdan yashirish; xato kiritilgan (hech qachon eʼlon qilinmagan) qoralamani oʻchirish — eʼlon qilingan biznes oʻchirilmaydi, yashiriladi
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
- **Xavfsizlik:** httpOnly sessiya + CSRF double-submit, alohida admin sessiyasi (`SameSite=Strict`), admin paroli Argon2 + majburiy 2FA (kalit shifrlangan), IP + login boʻyicha bloklash, har bir endpointda ruxsat tekshiruvi, bazada himoyalangan (faqat qoʻshiladigan) audit jurnali, Content-Security-Policy va Permissions-Policy ([ADR-0013](docs/adr/0013-xavfsizlik-sarlavhalari.md)).
- Backend uchun topshiriqlar roʻyxati: [docs/backend-handoff.md](docs/backend-handoff.md).

| Qatlam   | Tanlov                                                                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend | Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, next-intl, TanStack Query, React Hook Form + Zod, MapLibre |
| Backend  | Django 5.2 LTS + DRF, PostgreSQL 17 + PostGIS, Redis (kesh), pytest + kontrakt testlari                                                                |
| Infra    | GitHub Actions, Docker Compose, Caddy (HTTPS), Servercore VPS — Toshkent ([docs/deployment.md](docs/deployment.md))                                    |

Har bir tanlovning sababi — [docs/adr](docs/adr).

## Sifat

- **Testlar:** frontend — Vitest (unit, mock API xatti-harakati) va Playwright (E2E, 3 ekran: 375 / 768 / 1280 px); backend — pytest (har bir javob API kontraktiga qarshi, maʼlumotlar bazasi cheklovlari, ruxsatlar). Ikkalasi ham har bir push'da CI'da, ustiga integratsiya: haqiqiy backend bilan E2E (PostgreSQL + Redis + Django + Next.js + Caddy).
- **Sifat vositalari:** ESLint, Prettier, TypeScript (strict); ruff, mypy (strict); `npm audit` va `pip-audit`.
- **Accessibility:** axe (WCAG 2 A/AA) asosiy sahifalarda va admin panelda; klaviatura, ekran oʻquvchi yorliqlari.
- **SEO:** canonical, hreflang (uz/ru), Open Graph rasmi, `sitemap.xml`, `robots.txt`, schema.org (`LocalBusiness`, `WebSite`).
- Lighthouse natijalari va maʼlum cheklovlar — [docs/progress.md](docs/progress.md).

## Repo tuzilmasi

```text
.
├── frontend/              Next.js ilovasi (batafsil: frontend/README.md)
├── backend/               Django ilovasi (batafsil: backend/README.md)
├── deploy/                production: Docker Compose, Caddyfile, server sozlash, joylash, smoke test (docs/deployment.md)
├── docs/
│   ├── api/openapi.yaml   API kontrakti
│   ├── adr/               arxitektura qarorlari
│   ├── backend-handoff.md 3-bosqich uchun topshiriqlar
│   ├── integration-plan.md 4-bosqich (integratsiya) rejasi
│   ├── auth-setup.md       Telegram, Google va admin 2FA'ni sozlash
│   ├── phone-testing.md    telefonda sinash roʻyxati
│   ├── deployment.md       production tuzilmasi va joylash
│   ├── design-system.md   dizayn tizimi
│   └── progress.md        bajarilgan va qolgan ishlar
└── .github/workflows/     CI: frontend, backend, integratsiya, Docker (production to'plami)
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

Keyin `http://localhost:8090/admin` → login va parol → telefondagi autentifikator ilovasi (Google Authenticator, Aegis…) bilan QR'ni skanerlang → kod. Bizneslarni admin panelda qoʻshasiz — eʼlon qilingach saytda paydo boʻladi. Demo bizneslar bilan sinamoqchi boʻlsangiz (⚠ toʻqib chiqarilgan maʼlumot): `cd backend; .venv\Scripts\python manage.py seed_demo`; olib tashlash — `seed_demo --remove`.

Mijoz sifatida — "Demo foydalanuvchi sifatida kirish" (faqat lokal, backend `DEBUG` rejimida) yoki Telegram va Google: bot va Client ID'ni sozlash — [docs/auth-setup.md](docs/auth-setup.md). Telegram va telefonda sinash uchun vaqtinchalik HTTPS manzil: `start.ps1 -Tunnel` (Cloudflare Tunnel, `D:\tools\cloudflared`; ochiq paytda sayt internetdan koʻrinadi). `-Prod` — dev rejimi oʻrniga production build (telefonda tezroq, kesh haqiqiy saytdagidek); telefonda sinash roʻyxati — [docs/phone-testing.md](docs/phone-testing.md). Demo rejim (`npm run dev`, `http://localhost:3000`) avvalgidek ishlaydi.

## Tekshiruvlar

```bash
cd frontend
npm run check                # lint + typecheck + format + unit testlar
npm run build && npm run e2e # E2E demo rejimda (birinchi marta: npx playwright install chromium)
npm run e2e:backend          # E2E haqiqiy backend bilan (PostgreSQL, backend muhiti va Caddy kerak)

cd ../backend
ruff check . && ruff format --check . && mypy . && pytest
```

## Xavfsizlik

- Maxfiy kalitlar va parollar repoga **hech qachon** qoʻshilmaydi — faqat `.env.example` namunalari.
- Doʻkonlardan yigʻilgan real maʼlumotlar repoda saqlanmaydi.
- Ruxsatlar backendda tekshiriladi; interfeysdagi yashirish xavfsizlik chorasi hisoblanmaydi ([ADR-0009](docs/adr/0009-ruxsatlar-modeli.md)).
