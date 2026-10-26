# Ish holati

Oxirgi yangilanish: 2026-10-26

## Bosqichlar

| Bosqich | Mazmuni                           | Holat                                  |
| ------- | --------------------------------- | -------------------------------------- |
| 0       | Gʻoya tahlili, arxitektura        | ✅ Tasdiqlangan                        |
| 1       | Frontend rejasi                   | ✅ Tasdiqlangan                        |
| 2       | Frontend ishlab chiqish           | ✅ Tasdiqlangan                        |
| 3       | Backend                           | 🔄 Jarayonda ([reja](backend-plan.md)) |
| 4       | Integratsiya va yakuniy tekshiruv | ⏳                                     |
| 5       | Hosting va domen                  | ⏳                                     |

## 2-bosqich qadamlari

| Qadam | Mazmuni                                                                                          | Holat |
| ----- | ------------------------------------------------------------------------------------------------ | ----- |
| 2.1   | Poydevor: Next.js, TS, ESLint/Prettier, Tailwind, next-intl, Vitest, Playwright, CI, README, ADR | ✅    |
| 2.2   | Dizayn tizimi, umumiy komponentlar, layoutlar                                                    | ✅    |
| 2.3   | OpenAPI kontrakti, generatsiya, mock qatlam, demo maʼlumotlar                                    | ✅    |
| 2.4   | Bosh sahifa, kategoriyalar, roʻyxat, filtrlar, qidiruv                                           | ✅    |
| 2.5   | Biznes profili, mahsulot sahifasi, xarita                                                        | ✅    |
| 2.6   | Kirish (mock), mijoz kabineti, sharhlar, sevimlilar, shikoyatlar                                 | ✅    |
| 2.7   | Admin: kirish+2FA, layout, bizneslar, tezkor qoʻshish, katalog, rasmlar                          | ✅    |
| 2.8   | Admin: kategoriyalar, moderatsiya, shikoyatlar, soʻrovlar, foydalanuvchilar                      | ✅    |
| 2.9   | Admin: administratorlar, rollar, audit, sozlamalar, statistika, hisobot havolasi                 | ✅    |
| 2.10  | Statik sahifalar, SEO, a11y, tezlik, hujjatlar                                                   | ✅    |

## 3-bosqich qadamlari

| Qadam | Mazmuni                                                                              | Holat                  |
| ----- | ------------------------------------------------------------------------------------ | ---------------------- |
| 3.1   | Poydevor: Django, PostgreSQL + PostGIS, sozlamalar, testlar, kontrakt tekshiruvi, CI | ✅                     |
| 3.2   | Maʼlumot modeli va migratsiyalar                                                     | ✅                     |
| 3.3   | Ommaviy API                                                                          | ✅                     |
| 3.4   | Mijoz autentifikatsiyasi, kabinet                                                    | ✅                     |
| 3.5   | Admin autentifikatsiyasi, RBAC, audit                                                | ✅ (tasdiq kutilmoqda) |
| 3.6   | Admin API: bizneslar, rasmlar, katalog                                               | ⏳                     |
| 3.7   | Admin API: moderatsiya, kategoriyalar, administratorlar, sozlamalar                  | ⏳                     |
| 3.8   | Statistika, hisobot havolasi, davriy vazifalar, xavfsizlik                           | ⏳                     |
| 3.9   | Kontrakt boʻyicha yakuniy tekshiruv, hujjatlar                                       | ⏳                     |

## 3.5 natijalari

Yangi ilova — `apps/staff`: administratorlar, rollar, admin sessiyalari, kirish challenge'lari, audit jurnali.

| Endpoint / buyruq                          | Imkoniyatlar                                                                                                                                                                                                |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /admin/auth/login`                   | Login + parol (Argon2). Javob: `challengeToken` (5 daqiqa), `next` (`totp` yoki `setup`), `mustChangePassword`. Notoʻgʻri parol, nomaʼlum login va oʻchirilgan akkaunt — bir xil 401 va bir xil javob vaqti |
| `POST /admin/auth/setup`                   | **Yangi.** Birinchi kirish yoki tiklangan akkaunt: yangi parol (kamida 12 belgi, oddiy, faqat raqamli, loginga oʻxshash va avvalgi parol taqiqlangan) va TOTP kaliti (QR — SVG, kalit matni)                |
| `POST /admin/auth/2fa`                     | TOTP kodi (±30 soniya). Bir kodni qayta ishlatib boʻlmaydi; 5 ta notoʻgʻri kod — challenge bekor (429). Muvaffaqiyatli boʻlsa `adminsessionid` (HttpOnly, SameSite=Strict, 8 soat)                          |
| `POST /admin/auth/logout`, `GET /admin/me` | Chiqish (CSRF bilan), joriy admin va amaldagi ruxsatlari                                                                                                                                                    |
| `python manage.py createroot`              | Yagona Root (DB cheklovi); parol faqat `getpass` yoki `--password-stdin` orqali (shell tarixida qolmaydi)                                                                                                   |

- **Parol tanlashga qarshi:** IP + login juftligi — 15 daqiqada 5 xato → 15 daqiqa blok; faqat login boʻyicha (turli IP'lardan) — 20 xato; IP boʻyicha umumiy chegara — 30/daqiqa. Begona odam haqiqiy adminni oʻz IP'sidan bloklay olmaydi.
- **2FA kalitlari** bazada Fernet bilan shifrlangan (`TOTP_ENCRYPTION_KEY` — productionda majburiy, yoʻq boʻlsa ilova ishga tushmaydi).
- **Sozlash atomar:** yangi parol va kalit challenge'da kutadi, faqat toʻgʻri kod kiritilgach akkauntga yoziladi — jarayon yarim yoʻlda qolsa, akkaunt oʻzgarmaydi.
- **RBAC:** 12 ta atomar ruxsat (kontraktdagi roʻyxat bilan bir xilligi testda), 3 ta tizim roli (Moderator, Kontent menejeri, Tahlilchi), amaldagi ruxsatlar = rollar ∪ alohida; Root — hammasi. View'larda: `IsAdmin` + `admin_permission` (`"root"` — faqat Root).
- **Audit jurnali faqat qoʻshiladi:** UPDATE, DELETE va TRUNCATE bazadagi trigger bilan rad etiladi; yozuvi bor administratorni oʻchirib boʻlmaydi (faqat oʻchiriladi). DB cheklovlari: bitta Root, Root'ni oʻchirib boʻlmaydi, login formati.
- **Umumiy CSRF tokeni:** mijoz va admin sessiyasi bir brauzerda ochiq boʻlsa, ikkalasi bir xil `csrftoken` ni ishlatadi — biri kirsa yoki chiqsa, ikkinchisi buzilmaydi.
- **Frontend:** kirish oynasiga sozlash bosqichi qoʻshildi (yangi parol ×2 → QR va kalit → kod); mock ham shu oqimda (yangi va paroli tiklangan administrator birinchi kirishda sozlaydi); E2E testi yangilandi.
- Testlar: backend 185 (+46), frontend unit 204, E2E 221 (3 ekran).

**Kontrakt oʻzgardi:** `login` javobi `AdminLoginChallenge` (`next`, `mustChangePassword`); yangi `POST /admin/auth/setup` (`AdminTotpSetup`); admin chiqishiga 403 (CSRF).

**Hali ishlamaydi / qoldi:**

- Administratorlar, rollar, parolni tiklash, audit roʻyxati endpointlari — 3.7 (model va ruxsat tekshiruvi tayyor).
- Bloklash hisoblagichlari hozircha jarayon xotirasida (LocMem) — bir nechta jarayonli productionda Redis kerak (3.8).
- Faol admin sessiyalarini koʻrish va bekor qilish (ADR-0006) — kontraktda endpoint yoʻq; hozircha parolni tiklash va oʻchirish sessiyalarni tugatadi (3.7).
- `TOTP_ENCRYPTION_KEY` yoʻqolsa, barcha administratorlar 2FA'ni qaytadan sozlashi kerak — kalit zaxirasi hosting bosqichida (5) rejalashtiriladi.
- Haqiqiy autentifikator ilovasi bilan qoʻlda sinov — 4-bosqichda (testlarda RFC 6238 boʻyicha `pyotp` bilan tekshirildi).

## 3.4 natijalari

| Endpoint                                                                    | Imkoniyatlar                                                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/telegram`                                                       | Telegram Login Widget imzosi (HMAC-SHA256, kalit — bot tokenining xeshi), `auth_date` muddati (24 soat), faqat Telegram maydonlari |
| `POST /auth/google`                                                         | Rasmiy `google-auth` bilan ID token (imzo, muddat, `aud`, `iss`, tasdiqlangan email); email saqlanmaydi — faqat `sub`              |
| `POST /auth/demo`                                                           | Faqat `DEBUG` rejimida (integratsiya sinovlari); productionda 404, `DEBUG` siz yoqilsa ilova ishga tushmaydi                       |
| `POST /auth/logout`, `GET/PATCH/DELETE /me`                                 | Chiqish, ismni oʻzgartirish, akkauntni oʻchirish (chop etilgan sharhlar muallifsiz qoladi, qolganlari oʻchadi)                     |
| `/me/favorites`, `/me/favorites/ids`, `PUT/DELETE /me/favorites/{id}`       | Sevimlilar (faqat eʼlon qilinganlar, oxirgi qoʻshilgani birinchi)                                                                  |
| `POST /businesses/{slug}/reviews`, `/me/reviews`, `DELETE /me/reviews/{id}` | Sharh (bitta biznesga bitta — 409), moderatsiya sozlamasiga koʻra; chop etilganda reyting atomar yangilanadi                       |
| `POST /complaints`, `/me/complaints`                                        | Shikoyat ("Boshqa" — kamida 10 belgi)                                                                                              |

- **Sessiya:** `sessionid` — HttpOnly, SameSite=Lax, 30 kun, productionda Secure; token bazada faqat SHA-256 xeshi. `csrftoken` — double-submit: sarlavha = cookie = sessiyadagi token (vaqtga chidamli taqqoslash).
- **Cheklovlar:** kirish — IP boʻyicha (20/daqiqa); sharh va shikoyat — foydalanuvchi boʻyicha (10/soat).
- Bloklangan foydalanuvchi kira olmaydi (403 `account_blocked`), sessiyasi ham ishlamaydi.
- Provayder sozlanmagan boʻlsa (token yoki client ID yoʻq) — halol `401 provider_unavailable`.
- **Frontend keshini yangilash** (`apps/core/revalidate.py`): oʻzgarishdan keyin frontendning `/api/revalidate` webhook'i chaqiriladi — faqat tranzaksiya muvaffaqiyatli yakunlanganda; frontend javob bermasa ham foydalanuvchi soʻrovi buzilmaydi.
- Testlar: 139 (backend), har bir javob kontraktga qarshi.

**Kontrakt toʻldirildi:** kirish endpointlarida 403 (bloklangan) va 429, demo — 404 (productionda), chiqish — 403 (CSRF), sharh va shikoyatda — 429.

**Hali ishlamaydi / sinalmagan:**

- **Telegram va Google orqali haqiqiy kirish sinalmagan.** Imzo tekshiruvi testlarda Telegram hujjatidagi algoritm bilan sinaldi, lekin haqiqiy bot (@BotFather, bepul) va Google OAuth mijozi (bepul) domen bilan birga kerak — 4/5-bosqichda.
- Frontend brauzer soʻrovlari (`/api/v1`) backendga reverse proxy orqali yetadi — 4-bosqich.
- Bloklash amali (admin) — 3.7; productionda cookie'lar faqat HTTPS — `SESSION_COOKIES_SECURE` (standart: DEBUG oʻchiq boʻlsa yoqiq).

## 3.3 natijalari

| Endpoint                                                            | Imkoniyatlar                                                                                                                                                           |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /categories`, `/categories/{slug}`, `/districts`               | Daraxt, eʼlon qilingan bizneslar soni (ichki kategoriyalar bilan), atributlar joriy tilda                                                                              |
| `GET /businesses`                                                   | Qidiruv (lotin, kirill, imlo xatosi), kategoriya (ota-kategoriya ichkilarini ham), tuman, "hozir ochiq", masofa; saralash: tavsiya, reyting, masofa, yangi; sahifalash |
| `GET /businesses/{slug}`, `/items`, `/items/{itemSlug}`, `/reviews` | Profil (galereya, narx oraligʻi katalogdan), katalog, faqat chop etilgan sharhlar ("Malika R.", oʻchirilgan muallif — "Oʻchirilgan foydalanuvchi")                     |
| `GET /map/markers`, `/search/suggest`                               | Xarita nuqtalari (1000 tagacha), takliflar (5+5)                                                                                                                       |
| `POST /events`                                                      | Kunlik statistika hisoblagichi (faqat son, parallel soʻrovlarga chidamli), IP boʻyicha cheklov                                                                         |
| `POST /business-requests`, `GET /settings`                          | Soʻrov formasi (raqam E.164 ga, rozilik majburiy, forma yopiq boʻlsa 403, IP boʻyicha cheklov), ommaviy kontaktlar                                                     |

- Xatti-harakat frontend mock'i bilan bir xil: "tavsiya etilgan" formulasi, "hozir ochiq" (yarim tundan va yakshanbadan dushanbaga oʻtadigan oraliqlar bilan), parametr xatolari (`fields`).
- Faqat eʼlon qilingan bizneslar koʻrinadi; qoralama — 404.
- Testlar: 112 (backend), har bir javob kontraktga qarshi tekshiriladi.
- **Real frontend bilan sinov:** frontend demo rejimisiz, backendga ulab yigʻildi va ishga tushirildi. Server tomonda render qilinadigan sahifalar (bosh sahifa, kategoriya, biznes profili, mahsulot, qidiruv, rus tili) backend maʼlumotlarini toʻgʻri koʻrsatdi. Sinov maʼlumotlari keyin oʻchirildi.

**Topilgan va tuzatilgan:**

- Kontraktda eʼlon qilinmagan javoblar (kontrakt tekshiruvi ushladi): `/search/suggest` — 400, `/events` — 429, `/business-requests` — 403 `requests_closed`. Kontrakt toʻldirildi.
- **Frontend production build haqiqiy backend bilan yiqilardi**: Cache Components rejimida `generateStaticParams` boʻsh roʻyxat qaytarsa build xatosi — yangi (boʻsh) bazada yoki mahsuloti yoʻq biznesda. Demo maʼlumotlarda bunday holat yoʻqligi uchun yashirin edi. Endi boʻsh boʻlsa placeholder (Next.js hujjatidagi tavsiya), sahifa uni 404 qiladi.
- **Har bir ommaviy sahifaga barcha tarjimalar, jumladan admin panel matnlari ham yuborilardi** (tarjimalarning 58 %, ~22 KB). Endi admin matnlari faqat admin boʻlimida.

**Hali ishlamaydi:**

- Brauzerdan keladigan `/api/v1` soʻrovlari (sevimlilar, sharh yozish, xarita filtrlari va h.k.) productionda reverse proxy orqali backendga yetadi — 4-bosqichda sozlanadi va sinaladi.
- Kirish talab qiladigan endpointlar (sharh yozish, sevimlilar, admin) — 3.4–3.7.
- Kesh hozircha xotirada (cheklov hisoblagichlari bitta jarayonda); productionda Redis — 3.8.
- Kirishsiz POST endpointlarida `Origin` tekshiruvi — 3.8.
- Topilmagan biznes sahifasi "200 + noindex" qaytaradi (Next 16 xususiyati, maʼlum cheklovlarda).

## 3.2 natijalari

- **Modellar** (5 ilova): `catalog` (tumanlar, kategoriyalar va atributlar), `accounts` (mijozlar — parolsiz, Telegram/Google), `businesses` (biznes, rasmlar, katalog, "Biznesingizni qoʻshing" soʻrovlari), `community` (sharhlar, shikoyatlar, sevimlilar), `core` (platforma sozlamalari). Sxema va diagramma — [backend-data-model.md](backend-data-model.md).
- **Joylashuv** — PostGIS `geography` (masofa metrlarda; ikki nuqta orasidagi masofa test bilan tekshirildi).
- **Qidiruv** — normallashtirilgan `search_text` + GIN trigram indeks: lotin, kirill va imlo xatosi bilan (`ustos` → "Ustoz") topadi. Normalizatsiya frontend bilan bir xil (bir xil test holatlari).
- **15 ta maʼlumotlar bazasi cheklovi**: eʼlon qilish shartlari, narx izchilligi, bitta foydalanuvchi — bitta sharh va boshqalar. API'ni chetlab oʻtgan kod ham ularni buzolmaydi.
- **Boshlangʻich maʼlumot** (data migratsiya): 12 tuman va 61 kategoriya — frontend bilan bir xil slug'lar, frontend fixture'laridan avtomatik koʻchirilgan. Demo bizneslar productionga tushmaydi.
- Ish vaqti (`WeeklySchedule`) tekshiruvi — frontend mock'idagi qoidalar bilan bir xil.
- Testlar endi migratsiyalar bilan ishlaydi; model oʻzgarib migratsiya unutilsa — test yiqiladi. Jami 63 test, ruff va mypy (strict) — xatosiz.

**Topilgan va tuzatilgan:** narx cheklovi narxsiz "aniq narx"ni oʻtkazib yuborardi — SQL'da `NULL > 0` natijasi `NULL`, `CHECK` esa uni "oʻtdi" deb hisoblaydi. Har bir shoxga `IS NOT NULL` aniq qoʻshildi (test buni ushladi).

**Oʻzgarish:** `factory_boy` olib tashlandi — qatʼiy mypy bilan tiplari mos emas; oʻrniga oddiy tiplangan yordamchi funksiyalar (`tests/factories.py`).

**Hali ishlamaydi:**

- Endpointlar yoʻq — maʼlumotlar API orqali hali koʻrinmaydi (3.3).
- Administratorlar, rollar, audit (3.5), statistika va hisobot havolalari (3.8) jadvallari keyingi qadamlarda.
- Kategoriya yoki tuman nomi oʻzgarganda `search_text` ni yangilash — 3.7.
- Rasm fayllarini saqlash va qayta kodlash — 3.6.

## 3.1 natijalari

- **Lokal maʼlumotlar bazasi** (C: diskka hech narsa yozilmagan): PostgreSQL 17.11 va PostGIS 3.6.2 — rasmiy bepul arxivlardan `D:\tools\pgsql` ga (PostGIS arxivining MD5 yigʻindisi tekshirildi), maʼlumotlar — `D:\tools\pgdata`. Server faqat `127.0.0.1` da; superuser va ilova paroli tasodifiy, repodan tashqarida.
- Ilova roli `yaqin` superuser emas; kengaytmalar (`postgis`, `pg_trgm`, `unaccent`) `scripts/setup-db.sql` bilan — skript alohida vaqtinchalik klasterda sinab koʻrildi.
- **Django 5.2.18 LTS + DRF 3.18.3**, Python virtual muhiti va pip keshi D: diskda. Bogʻliqliklar aniq versiyalar bilan, `pip-audit` — zaiflik yoʻq.
- **GeoDjango Windows'da ishladi** — PostGIS toʻplamidagi GDAL/GEOS DLL'lari bilan (rejadagi asosiy xavf yopildi).
- Sozlamalar muhit oʻzgaruvchilaridan (`.env` faqat lokal); productionda `DJANGO_SECRET_KEY` boʻlmasa ilova ishga tushmaydi.
- Xatolar kontraktdagi `Error` formatida (`code`, `message`, `fields`) — DRF tashqarisidagi 404/500 ham JSON (HTML sahifa emas).
- **Kontrakt tekshiruvi:** `tests/contract.py` har bir javobni `openapi.yaml` ga qarshi tekshiradi; sxemaga zid javob testni yiqitishi ham test bilan isbotlangan.
- `GET /api/v1/health` — kontraktga qoʻshildi (ilova va baza holati, ichki tafsilotsiz).
- Sifat: ruff (lint + format), mypy (strict) — xatosiz; 13 test.
- **CI** (`.github/workflows/backend.yml`): PostGIS servisi, `setup-db.sql`, pip-audit, ruff, mypy, `check --deploy`, pytest.
- ADR-0004 yangilandi: OpenAPI manbasi — qoʻlda yoziladigan kontrakt (drf-spectacular oʻrniga).

**Hali ishlamaydi:**

- Modellar, endpointlar, autentifikatsiya — keyingi qadamlarda.
- `check --deploy` ogohlantirishlari: CSRF middleware (3.4, sessiyalar bilan), HSTS va HTTPS'ga yoʻnaltirish (3.8).
- CI GitHub'da hali ishga tushmagan — siz push qilganingizda birinchi marta ishlaydi.
- Lokal PostgreSQL kompyuter qayta yoqilganda avtomatik ishga tushmaydi — buyruq `backend/README.md` da.

## 2.1 natijalari

- Next.js 16.4.3 + React 19.3, TypeScript strict, Tailwind CSS 4.
- next-intl 4.14: `uz` (prefikssiz) va `ru` (`/ru`), til `next/root-params` orqali, `src/proxy.ts`.
- 404: tilga mos (`[locale]/not-found.tsx`) va global (`global-not-found.tsx`).
- Inter shrifti: latin, latin-ext, kirill.
- Narx formatlash (`src/lib/format/price.ts`) + 10 ta unit test.
- E2E: 5 ta test × 3 ekran (375/768/1280) — til, 404 holat kodi, gorizontal scroll, axe (WCAG 2 AA).
- GitHub Actions: lint, typecheck, format, unit, build, e2e.

## 2.2 natijalari

- Dizayn tokenlari (firuza + amber + stone), WCAG AA kontrast — [design-system.md](design-system.md).
- shadcn/ui (Radix) komponentlari; telefon uchun kattalashtirilgan oʻlchamlar.
- Karkas: header (qidiruv, til, kirish), telefonda pastki navigatsiya, footer, demo ogohlantirish, tilga mos 404.
- Soha komponentlari: BusinessCard (+ skeleton), OpenStatusBadge, RatingStars/RatingInline, PriceTag, CategoryTile, CategoryIcon.
- Holatlar: EmptyState, ErrorState.
- Masofa va kasr formatlash + testlar (jami 29 unit test).
- Komponentlar koʻrgazmasi: `/dev/ui` (production'da yopiq).
- E2E: 31 test (karkas, til almashtirish, qidiruv formasi, klaviatura, 404, axe); koʻrgazma sahifasi axe boʻyicha qoʻlda tekshirildi — 0 xato.

### 2.2 davomida qabul qilingan texnik qarorlar

- **Til faqat URL'dan aniqlanadi** (`localeDetection: false`, cookie yoʻq). Avtomatik aniqlash rus tilidan oʻzbekchaga qaytishda URL'ni `/uz` holida qoldirib ketardi (E2E test aniqladi).
- shadcn'ning `cn` paketi (shadcn muallifining rasmiy paketi) — `clsx + tailwind-merge` oʻrniga.
- `next-themes` olib tashlandi (faqat yorugʻ tema).
- shadcn standartidagi ikki kontrast xatosi tuzatildi: `destructive` → `#B91C1C`, faol boʻlmagan tab matni.

## 2.3–2.4 natijalari

**Ishlaydigan sahifalar** (demo maʼlumotlar bilan):

| Sahifa               | Imkoniyatlar                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `/`                  | Qidiruv, "Yaqin atrofimda", 12 kategoriya, yangi qoʻshilganlar, tumanlar                     |
| `/kategoriyalar`     | Barcha kategoriyalar va ichki kategoriyalar, bizneslar soni                                  |
| `/kategoriya/[slug]` | Sahifa yoʻli, ichki kategoriya chiplari, filtrlar (tuman, hozir ochiq, saralash), sahifalash |
| `/qidiruv`           | Lotin/kirill qidiruv, kategoriya filtri, boʻsh natija holati                                 |

- API kontrakti: `docs/api/openapi.yaml` (ommaviy qism); tiplar generatsiya qilinadi, CI mosligini tekshiradi.
- Mock qatlam — jarayon ichidagi MSW handler'lari (ADR-0011); 54 ta toʻqima biznes, 12 tuman, 12 kategoriya / 62 ta ichki.
- "Hozir ochiq" — brauzerda, foydalanuvchi vaqti boʻyicha (yarim tundan keyin yopilish, tushlik, dam olish kunlari).
- Joylashuv — faqat foydalanuvchi ruxsati bilan, ~110 m aniqlikda cookie'da; URL'ga yozilmaydi.
- Testlar: 101 unit, 72 E2E (3 ekran), axe — bosh sahifa, kategoriyalar, qidiruv.

**Shu qadamlarda topilgan va tuzatilgan xatolar:**

- Til almashtirgich yuk ostida ruschadan oʻzbekchaga oʻtganda URL'ni `/uz` holida qoldirardi — endi til havolalari aniq yasaladi (`src/i18n/localized-path.ts`); 48/48 stress-test.
- Planshetda (768–1023 px) "Kategoriyalar" va "Xarita" havolalari yoʻq edi — endi ikonka koʻrinishida.
- "аптека" kabi soʻz oxiri farq qiladigan qidiruvlar topilmasdi.
- MSW'ning `Math.random()` prerender ogohlantirishi — `connection()` bilan.

**Hali ishlamaydi:** admin panel (2.7–2.9), statik sahifalar va "Biznes qoʻshish" formasi (2.10).

## 2.5 natijalari

| Sahifa                    | Imkoniyatlar                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/biznes/[slug]`          | Ish holati, reyting, narxlar (boʻlimlar, davomiylik, "...dan", "soʻrov boʻyicha"), haftalik ish vaqti (bugun belgilangan), manzil + moʻljal + xarita, sharhlar (oxirgi 5), JSON-LD |
| `/biznes/[slug]/sharhlar` | Barcha sharhlar, sahifalash                                                                                                                                                        |
| `/biznes/[slug]/[item]`   | Mahsulot/xizmat: narx, davomiylik, atributlar, biznes bilan bogʻlanish                                                                                                             |
| `/xarita`                 | MapLibre + OpenFreeMap, klasterlar, kategoriya va "hozir ochiq" filtri, roʻyxat, tanlangan biznes kartasi, "mening joylashuvim"                                                    |

- Bogʻlanish: qoʻngʻiroq (`tel:`), Telegram, Yandex/Google xaritada yoʻl, ulashish.
- Statistika hodisalari (`profile_view`, `call_click`, `direction_click`, `telegram_click`) — `/api/v1/events`, shaxsiy maʼlumotsiz.
- `/api/v1/*` route handler — brauzer soʻrovlari uchun (demo rejimda mock).
- API kontrakti kengaytirildi: items, reviews, map markers.
- MapLibre 6.13.0 (aniq versiya, 2 haftadan eski); worker `public/vendor` ga build oldidan koʻchiriladi.
- Testlar: 115 unit, 102 E2E.

**Topilgan va tuzatilgan:** xarita konteyneri balandligi 0 edi (MapLibre `position: relative` beradi); "soʻm dan" → "soʻmdan"; telefonda ish vaqti/manzil sahifa oxirida edi; tanlangan karta pastki menyu ostida qolardi; kichik xaritani manbalar yozuvi yopib qoʻyardi.

## 2.6 natijalari

| Sahifa / imkoniyat   | Tafsilot                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `/kirish`            | Demo kirish; Telegram/Google — faol emas (backend bilan 4-bosqichda), `?next=` bilan qaytish |
| Header               | Foydalanuvchi menyusi (profil, sevimlilar, sharhlarim, xabarlarim, chiqish)                  |
| `/profil`            | Ismni o'zgartirish, chiqish, akkauntni o'chirish (tasdiqlash bilan)                          |
| `/profil/sevimlilar` | Saqlangan bizneslar; yurakcha — kartalarda va profilda (optimistik yangilanish)              |
| `/profil/sharhlar`   | Holati bilan (moderatsiyada / chop etilgan / rad etilgan), o'chirish                         |
| `/profil/xabarlar`   | Noto'g'ri maʼlumot haqidagi xabarlar va holati                                               |
| Biznes profili       | "Sharh yozish" (1–5 yulduz, izoh, moderatsiya), "Maʼlumot notoʻgʻrimi? Xabar bering"         |

- Xavfsizlik: httpOnly sessiya, CSRF double-submit, himoyalangan sahifalar (proxy + server tekshiruvi), open redirect himoyasi — ADR-0012.
- Kutubxonalar (aniq versiyalar, ≥2 hafta): TanStack Query 5.104.1, React Hook Form 7.89.0, Zod 4.6.6 (4.6.5 dagi yuqori darajali zaiflik tufayli), @hookform/resolvers 5.9.1.
- CI'ga `npm audit --audit-level=high` qo'shildi.
- Testlar: 139 unit, 131 E2E.

**Topilgan va tuzatilgan:** reyting tanlansa ham forma "Bahoni tanlang" derdi (RHF `valueAsNumber` radio'da ishlamaydi); profil sahifalarida `Math.random` prerender ogohlantirishi; telefondagi kartada uzun nom yurakcha ostiga kirardi; "Saqlash" tugmasining ekran o'quvchi nomi ko'rinadigan matnga mos emas edi (WCAG 2.5.3).

## 2.7 natijalari

| Sahifa / imkoniyat       | Tafsilot                                                                                                                            |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/kirish`          | Login + parol → 6 xonali kod (TOTP, mock). 5 xato urinish → 60 s blok; kod 5 daqiqa amal qiladi                                     |
| Admin layout             | Desktop — chap panel, telefon — yuqori panel + menyu; telefonda "Biznes qoʻshish" tugmasi (bosh panel va roʻyxatda)                 |
| `/admin`                 | Bosh panel: eʼlon qilingan, qoralama, yashirilgan, rozilik qayd etilmagan bizneslar soni                                            |
| `/admin/bizneslar`       | Qidiruv, holat filtri (`?filtr=`), rasm va narxlar soni, "Yana koʻrsatish"                                                          |
| `/admin/bizneslar/yangi` | 7 qadamli usta: asosiy → joylashuv (GPS yoki xaritada belgilash) → rasmlar (kamera) → ish vaqti → aloqa + rozilik → katalog → eʼlon |
| `/admin/bizneslar/[id]`  | Xuddi shu boʻlimlar tablarda (`?bolim=`); oʻzgarish saqlangach ommaviy sahifa keshi yangilanadi                                     |

- Ruxsatlar backend/mock'da tekshiriladi (ADR-0009): demo `moderator` bizneslarni koʻradi, lekin tahrirlay olmaydi.
- Eʼlon qilish uchun joylashuv, manzil va egasining roziligi majburiy (ADR-0007).
- Rasmlar: brauzerda qayta siqiladi (EXIF, jumladan GPS, olib tashlanadi), JPEG/PNG/WebP, 5 MB gacha, 12 tagacha, tartibini oʻzgartirish va oʻchirish.
- Har bir oʻzgarish audit jurnaliga yoziladi (koʻrish sahifasi — 2.9).
- Production uchun `/api/revalidate` webhook'i (Bearer `REVALIDATE_SECRET`, vaqtga chidamli taqqoslash) — backend 3-bosqichda ishlatadi.
- Testlar: 167 unit, 152 E2E (3 ekran; admin testlari 4 marta takrorlab ham oʻtdi).

**Topilgan va tuzatilgan:**

- Sahifa toʻliq yuklanishidan oldin kiritilgan login/parol yoʻqolardi; JavaScript yuklanmay turib yuborilsa, parol URL'ga tushishi mumkin edi. Endi maydonlar boshqarilmaydi, forma `method="post"`, tugma sahifa tayyor boʻlguncha faolsiz.
- shadcn `Alert` har doim `role="alert"` berardi — statik maslahatlar ekran oʻquvchida favqulodda xabar kabi oʻqilardi.
- Demo rejimda yuklangan rasmlar `next/image` optimizatorida 404 berardi (server xotirasida) — demo'da optimizatsiyasiz.
- "Biznes qoʻshish" tugmasi forma sahifalarida formaning oʻz tugmalarini toʻsardi.
- Server sahifalaridan client moduldagi funksiyalar chaqirilardi — `admin-params.ts` ga ajratildi.

**Hali ishlamaydi / mock:**

- 2FA — har doim `123456`; haqiqiy TOTP (kalit yaratish, QR) backend bilan (3-bosqich).
- Login cheklovi faqat login boʻyicha; backend'da IP + login boʻyicha boʻladi (ADR-0006).
- Rasmlar va barcha admin oʻzgarishlari server xotirasida — qayta ishga tushganda oʻchadi.
- Kategoriyalar, moderatsiya, shikoyatlar (2.8), administratorlar, audit koʻrish, statistika (2.9) — hali yoʻq.

## 2.8 natijalari

| Sahifa                      | Ruxsat             | Imkoniyatlar                                                                                                                                          |
| --------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/sorovlar`           | `business.edit`    | "Biznesingizni qoʻshing" soʻrovlari: qoʻngʻiroq, "Bogʻlanildi", rad etish (izoh bilan), **soʻrovdan qoralama** → usta joylashuv qadamidan davom etadi |
| `/admin/sharhlar`           | `review.moderate`  | Navbat (eng eskisi birinchi), chop etish, sabab bilan rad etish (tayyor variantlar); chop etilgan sharh saytda va reytingda                           |
| `/admin/shikoyatlar`        | `complaint.manage` | Koʻrib chiqishga olish, biznesni tahrirlashga oʻtish, javob bilan yopish — javob foydalanuvchiga koʻrinadi                                            |
| `/admin/kategoriyalar`      | `category.manage`  | Yoʻnalish (ikonka bilan) va ichki kategoriya qoʻshish, nomlarni tahrirlash, boʻsh kategoriyani oʻchirish                                              |
| `/admin/kategoriyalar/[id]` | `category.manage`  | Atributlar: matn, son (birlik), Ha/Yoʻq, bitta/bir nechta variant; tartib; katalog formasida tavsiya sifatida chiqadi                                 |
| `/admin/foydalanuvchilar`   | `user.view`        | Qidiruv, bloklanganlar filtri; bloklash/blokdan chiqarish — `user.manage` (sessiyalar darhol tugatiladi)                                              |
| `/admin`                    | —                  | "Navbatda": yangi soʻrovlar, moderatsiyadagi sharhlar, ochiq shikoyatlar (faqat ruxsat bor boʻlimlar)                                                 |

- API kontrakti: kategoriyalar/atributlar, sharhlar, shikoyatlar, soʻrovlar (shu jumladan ommaviy `POST /business-requests` — 2.10 dagi forma uchun), foydalanuvchilar; yangi ruxsat `user.manage` (ADR-0009, 8-qoida).
- Sharh va shikoyatlar biznesga ID orqali bogʻlanadi — biznes nomi (slug) oʻzgarsa ham uzilmaydi.
- Kategoriya slug'i yaratilgandan keyin oʻzgarmaydi (URL'lar barqaror). Biznesi yoki ichki kategoriyasi bor kategoriyani oʻchirib boʻlmaydi.
- Demo navbat: 4 ta sharh, 3 ta shikoyat, 3 ta soʻrov, 6 ta foydalanuvchi (`fixtures/moderation.ts`, toʻqib chiqarilgan).
- Testlar: 187 unit, 173 E2E (3 ekran; admin testlari 3 marta takrorlab ham oʻtdi).

**Topilgan va tuzatilgan:**

- Brauzerda oʻzbekcha sana "2026 M10 25" koʻrinishida chiqardi (Chrome'ning ICU maʼlumotlarida `uz` oy nomlari yoʻq) — mijoz kabinetidagi sharh va xabarlar sanalariga ham taʼsir qilardi. Endi oy nomlari qoʻlda: "25-oktabr, 2026".
- Mijozning sharh/shikoyati biznes nomi oʻzgarganda eski slug bilan qolib ketardi.

**Hali ishlamaydi / mock:**

- "Biznesingizni qoʻshing" ommaviy formasi — 2.10 da (endpoint va admin tomoni tayyor). Mock'da IP boʻyicha cheklov yoʻq — backend'da boʻladi.
- Atributlar boʻyicha ommaviy filtrlar yoʻq (`filterable` belgisi kontraktda bor, interfeysda ishlatilmaydi).
- Kategoriyalar tartibini oʻzgartirish yoʻq (yangisi oxiriga qoʻshiladi).
- Demo kirish har safar yangi foydalanuvchi yaratadi, shuning uchun bloklashni faqat ochiq sessiyada sinash mumkin; haqiqiy Telegram/Google akkaunti qayta kira olmasligi — backend bilan.
- Administratorlar, audit jurnalini koʻrish, statistika — 2.9.

## 2.9 natijalari

| Sahifa                                 | Ruxsat                                        | Imkoniyatlar                                                                                                                                                                                                                          |
| -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/administratorlar`              | `staff.manage` (koʻrish), Root (oʻzgartirish) | Administrator qoʻshish (vaqtinchalik parol bir marta koʻrsatiladi), rollar va alohida ruxsatlar, **amaldagi ruxsatlar manbasi bilan**, parolni yangilash, oʻchirish (sessiyalar tugatiladi). Root'ni API orqali oʻzgartirib boʻlmaydi |
| `/admin/administratorlar?bolim=rollar` | xuddi shu                                     | Tizim rollari (Moderator, Kontent menejeri, Tahlilchi) va oʻz rollaringiz; ishlatilayotgan yoki tizim rolini oʻchirib boʻlmaydi                                                                                                       |
| `/admin/audit`                         | `audit.view`                                  | Barcha admin harakatlari (kirishlar bilan), tur boʻyicha filtr; faqat oʻqish                                                                                                                                                          |
| `/admin/statistika`                    | `stats.view`                                  | 7/30/90 kun: koʻrishlar, qoʻngʻiroq, Telegram, yoʻnalish; kunlik grafik + jadval; eng koʻp koʻrilgan 10 biznes; yangi kontent                                                                                                         |
| `/admin/sozlamalar`                    | `settings.manage`                             | Sharhlar oldindan moderatsiyasi (oʻchirilsa — darhol chiqadi), soʻrov formasi ochiq/yopiq, platforma kontaktlari                                                                                                                      |
| Biznes → "Statistika" tab              | `business.view`                               | Biznes statistikasi; **egasi uchun hisobot havolasi** (yaratish, ulashish, bekor qilish — `business.edit`)                                                                                                                            |
| `/hisobot/[token]`                     | ommaviy (maxfiy havola)                       | Egasi uchun: 30 kunlik koʻrishlar va bosishlar, shaxsiy maʼlumotsiz; `noindex`, `no-referrer`                                                                                                                                         |

- Statistika hodisalari (`/api/v1/events`) endi saqlanadi: kunlik hisoblagichlar, faqat son.
- Yangi ruxsat `stats.view`; moderator demo akkaunti: "Moderator" roli + alohida `business.view` (manba koʻrinishini koʻrsatish uchun).
- Grafik rangi (`--chart-1`, teal-600) palitra tekshiruvidan oʻtkazildi: `#0f766e` rang toʻyinganligi boʻyicha oʻtmadi.
- Testlar: 196 unit, 188 E2E (3 ekran; admin testlari 3 marta takrorlab ham oʻtdi).

**Topilgan va tuzatilgan:** statistika jadvalining aylantiriladigan hududi klaviatura bilan ochilmasdi (axe, WCAG 2.1.1); telefonda jadval ustunlari sarlavhalari yopishib qolardi.

**Hali ishlamaydi / mock:**

- ⚠ Statistika demo rejimda **namunaviy** (fixture bizneslar uchun deterministik toʻqib chiqarilgan qiymatlar); saytdagi haqiqiy bosishlar ustiga qoʻshiladi. Sahifalarda ogohlantirish bor.
- Yangi administrator: birinchi kirishda parolni almashtirish va shaxsiy TOTP (QR) sozlash — backend bilan (demo'da kod har doim `123456`).
- Platforma kontaktlari saqlanadi va `GET /settings` qaytaradi, saytda koʻrsatish — 2.10 ("Aloqa" sahifasi).
- Audit jurnalida administrator va sana boʻyicha filtr interfeysda yoʻq (API'da `adminId` bor).
- Hisobot havolasi uchun IP boʻyicha cheklov — backend'da.

## 2.10 natijalari

| Sahifa / imkoniyat        | Tafsilot                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/haqida`                 | Platforma qanday ishlaydi, bizneslar uchun shartlar (bepul, joyida, rozilik bilan, hisobot), tamoyillar                                                                         |
| `/aloqa`                  | Admin sozlamalaridagi kontaktlar (Telegram, telefon, email); boʻsh boʻlsa — soʻrov formasiga yoʻllanma                                                                          |
| `/biznes-qoshish`         | Kirishsiz soʻrov formasi: tekshiruv, shaxsiy maʼlumotga rozilik, raqam E.164 ga keltiriladi; forma yopiq boʻlsa — xabar. Soʻrov admin "Soʻrovlar" navbatiga tushadi             |
| `/shartlar`, `/maxfiylik` | Ikki tilda, mundarija bilan; **loyiha sifatida belgilangan** (huquqshunos tekshiruvi kerak)                                                                                     |
| SEO                       | canonical, hreflang (uz/ru/x-default), Open Graph + OG rasm (`/opengraph-image`), `sitemap.xml` (≈700 manzil, hreflang bilan), `robots.txt`, `WebSite` + `SearchAction` JSON-LD |
| Demo rejim                | `robots.txt` — `Disallow: /`, sahifalarda `noindex`: toʻqib chiqarilgan maʼlumotlar qidiruvga tushmaydi                                                                         |

- Footer'ga "Aloqa" havolasi qoʻshildi; barcha footer havolalari endi ishlaydi.
- [docs/backend-handoff.md](backend-handoff.md) — 3-bosqich uchun barcha talablar bir joyda (auth, cheklovlar, RBAC, rasmlar, kesh teglari, maxfiylik vaʼdalari).
- README'lar yangilandi: imkoniyatlar, demo kirish, arxitektura, muhit oʻzgaruvchilari.
- Testlar: 200 unit, 221 E2E (3 ekran).

**Lighthouse** (telefon emulyatsiyasi, CPU 4× sekinlashtirilgan, production build, lokal server). Qavs ichida — optimizatsiyadan oldin:

| Sahifa          |  Tezlik | Accessibility | Best practices | SEO\* |         LCP |          TBT |  CLS |
| --------------- | ------: | ------------: | -------------: | ----: | ----------: | -----------: | ---: |
| Bosh sahifa     | 77 (60) |           100 |             96 |    58 | 3,7 s (5,1) | 490 ms (890) |    0 |
| Biznes profili  | 70 (62) |           100 |            100 |    58 | 4,1 s (4,9) | 680 ms (770) |    0 |
| Kategoriya (ru) | 72 (65) |      98 → 100 |            100 |    58 | 3,9 s (4,1) | 540 ms (750) |    0 |
| Xarita          |      39 |           100 |             96 |    58 |       8,3 s |        4,2 s | 0,02 |

\* SEO past — demo rejimdagi `noindex` va lokal portdagi canonical (`NEXT_PUBLIC_SITE_URL` boshqa port) sababli; production'da bu ikki band oʻtadi.

**Topilgan va tuzatilgan:**

- Shrift: `latin`, `latin-ext` va `cyrillic` toʻplamlari har sahifada oldindan yuklanardi. Oʻzbek lotin yozuvidagi ʻ ʼ `latin` da bor — endi faqat u oldindan yuklanadi, kirill kerak boʻlganda (`unicode-range`). Bu LCP va TBT'ni eng koʻp yaxshiladi.
- Mehmon foydalanuvchi uchun har sahifada `/api/v1/me` soʻrovi yuborilib, konsolda 401 xatosi chiqardi — endi `csrftoken` cookie boʻlmasa soʻrov yuborilmaydi.
- Sarlavhalar tartibi (`h1 → h3`) natijalar, sevimlilar va statistika sahifalarida buzilgan edi (Lighthouse `heading-order`).
- Akkaunt oʻchirilganda mock chop etilgan sharhlarni ham oʻchirardi — kontraktdagidek "Oʻchirilgan foydalanuvchi" nomi bilan qoladigan qilindi (maxfiylik siyosati shunga mos).
- Open Graph rasmi sahifalar oʻz openGraph'ini berganda meros qilinmasdi — har sahifaga aniq beriladi.

**Hali ishlamaydi / qoldi:**

- Xarita sahifasi ogʻir: MapLibre va WebGL; headless Chrome'da GPU yoʻqligi TBT'ni oshiradi. Keyinroq: xaritani foydalanuvchi harakatigacha kechiktirish yoki statik oldindan koʻrinish.
- Hydration (React) TBT'ning asosiy qismi — server komponentlariga koʻproq koʻchirish keyingi optimizatsiya.
- Soʻrov formasida spamga qarshi himoya (IP cheklovi, honeypot/captcha) — backend'da.
- "Oʻchirilgan foydalanuvchi" yorligʻi mock'da faqat oʻzbekcha (backend `lang` bilan beradi).
- Huquqiy matnlar huquqshunos tekshiruvidan oʻtmagan.

## 2-bosqich yakuni

Frontend toʻliq: ommaviy sayt, mijoz kabineti, admin panel (biznes qoʻshish, moderatsiya, ruxsatlar, audit, statistika), statik sahifalar va SEO — hammasi kontrakt va mock qatlam ustida. Keyingi qadam — **3-bosqich (Django backend)**, faqat tasdiqdan keyin. Boshlash nuqtasi: [docs/backend-handoff.md](backend-handoff.md).

## Maʼlum cheklovlar

- Docker kompyuterda oʻrnatilmagan — 3-bosqichda (PostgreSQL uchun) kerak boʻladi.
- Build'da maʼlum boʻlmagan kategoriya slug'i baʼzan 404 oʻrniga 200 + `noindex` qaytaradi (Next 16 oqimli render xususiyati); qidiruv tizimlari indekslamaydi.
- Partial Prefetching'ning bitta prefetch soʻrovi baʼzan ochiq qoladi (foydalanuvchiga taʼsiri yoʻq); kuzatib boriladi.
- Xarita yorliqlari OpenStreetMap maʼlumotlaridan (koʻpincha lotin/ingliz yozuvida) — tile provayderi bilan bogʻliq.
- Demo bizneslarda Telegram yoʻq (mavjud boʻlishi mumkin boʻlgan akkauntlarni ishlatmaslik uchun) — tugma maʼlumot boʻlganda chiqadi.
- Demo foydalanuvchilar, sevimlilar, sharhlar, xabarlar, rasmlar va admin oʻzgarishlari server xotirasida — qayta ishga tushganda oʻchadi. Next.js sahifa keshi esa diskda qoladi: qayta ishga tushirilgandan keyin keshlangan sahifa yoʻqolgan rasmga havola qilishi mumkin (404). Faqat demo'ga xos — backend maʼlumotni saqlaydi.
- Telegram/Google orqali kirish — backend bilan birga (4-bosqich).
