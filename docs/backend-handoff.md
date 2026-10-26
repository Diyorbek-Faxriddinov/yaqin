# Backend uchun topshiriq (3-bosqich)

Frontend 2-bosqichda **kontrakt asosida** (contract-first) qurildi. Backend shu kontraktni bajarsa, frontend deyarli oʻzgarishsiz ulanadi (`NEXT_PUBLIC_DEMO_MODE=false` + `API_URL`).

| Manba                                          | Nima beradi                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| [`docs/api/openapi.yaml`](api/openapi.yaml)    | Barcha endpointlar, sxemalar, ruxsatlar va xatti-harakat tavsiflari — **yagona manba** |
| [`frontend/src/mocks/`](../frontend/src/mocks) | Kontraktning ishlaydigan namunasi: tekshiruvlar, saralash, ruxsatlar, audit            |
| `frontend/src/mocks/*.test.ts`                 | Xatti-harakat testlari — backend testlariga koʻchirish uchun tayyor ssenariylar        |
| [`docs/adr/`](adr)                             | Arxitektura qarorlari (auth, RBAC, maʼlumot kelishuvlari, hosting)                     |

Mock'dagi demo maʼlumotlar (`fixtures/`) productionga **koʻchirilmaydi** — haqiqiy maʼlumot admin panel orqali kiritiladi.

## 1. Autentifikatsiya va sessiyalar (ADR-0006, ADR-0012)

- [x] Telegram Login: `hash` ni bot tokeni bilan tekshirish, `auth_date` muddati; Google OAuth (ID token tekshiruvi). — 3.4 (imzo testlarda; haqiqiy bot va Google client ID bilan — 4/5-bosqich)
- [x] Mijoz sessiyasi: `sessionid` — `HttpOnly; Secure; SameSite=Lax`, 30 kun; `csrftoken` — JS oʻqiy oladigan cookie (double-submit, `X-CSRFToken`). — 3.4 (token bazada xesh ko'rinishida)
- [x] Admin sessiyasi alohida: `adminsessionid` — `SameSite=Strict`, 8 soat. — 3.5
- [x] Admin parollari — Argon2; TOTP — har bir admin uchun alohida maxfiy kalit, birinchi kirishda QR orqali sozlash; vaqtinchalik parol bilan kirganda parolni almashtirish majburiy. — 3.5 (TOTP kaliti Fernet bilan shifrlangan; yangi parol va kalit faqat kod tasdiqlangach yoziladi)
- [x] Root faqat serverdagi CLI buyrugʻi bilan yaratiladi (API orqali emas). — 3.5 (`manage.py createroot`)
- [x] Bloklangan foydalanuvchi: sessiyalari darhol tugatiladi, qayta kirishda `403 account_blocked`. — 3.4 (kirish 403), 3.7 (bloklash amali, sessiyalar darhol tugatiladi)
- [x] Oʻchirilgan admin (`isActive=false`) — sessiyalari tugatiladi, kirish urinishi `401` (holat oshkor qilinmaydi). — 3.5 (kirish 401), 3.7 (oʻchirish amali, sessiyalar tugatiladi)

## 2. Cheklovlar (rate limiting) va suiisteʼmolga qarshi

| Endpoint                                              | Cheklov                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `POST /admin/auth/login`, `/admin/auth/2fa`           | **IP + login** juftligi va IP boʻyicha umumiy chegara (faqat login boʻyicha bloklash root'ni ataylab bloklashga imkon beradi) |
| `POST /business-requests`                             | IP boʻyicha; kerak boʻlsa honeypot maydon yoki captcha                                                                        |
| `GET /reports/{token}`                                | IP boʻyicha (token taxminlashga qarshi)                                                                                       |
| `POST /events`                                        | IP boʻyicha, botlarni filtrlash                                                                                               |
| `POST /businesses/{slug}/reviews`, `POST /complaints` | foydalanuvchi boʻyicha                                                                                                        |

- [x] Kirishsiz POST endpointlar (`/business-requests`, `/events`) mehmonda `csrftoken` boʻlmaydi — CSRF'dan ozod qilinadi, oʻrniga `Origin` tekshiruvi va cheklovlar. — 3.8 (`apps/core/middleware.py`: begona `Origin` — `403 origin_denied`; IP cheklovlari)

## 3. Ruxsatlar va audit (ADR-0009)

- [x] Har bir endpoint ruxsatni backendda tekshiradi (kontraktdagi `summary` da koʻrsatilgan). Interfeysdagi yashirish — faqat qulaylik. — 3.5–3.7 (`AdminView` + `admin_permission`; har endpointda testlar)
- [x] Administrator va rollarni oʻzgartirish — **faqat Root**; `staff.manage` — faqat koʻrish. Root API orqali oʻzgarmaydi. — 3.7 (Root'ga `root_immutable`)
- [x] Amaldagi ruxsatlar = rollar ∪ alohida ruxsatlar; manbasi bilan qaytariladi. — 3.5 (`/admin/me`), 3.7 (manbalar bilan)
- [x] Audit jurnali **faqat qoʻshiladi**: DB darajasida UPDATE/DELETE huquqi yoʻq. Kirishlar (`auth.login`) ham yoziladi. — 3.5 (DB trigger UPDATE/DELETE/TRUNCATE'ni rad etadi; `auth.login`, `auth.setup`, `auth.logout` yoziladi)
- [x] Shaxsiy maʼlumotlar eng kam ruxsat bilan: soʻrovlardagi telefonlar — `business.edit`; foydalanuvchilar roʻyxatida kontaktlar qaytarilmaydi. — 3.7

## 4. Maʼlumotlar va biznes qoidalari

- [x] Pul — tiyinda, butun son; vaqt — ISO 8601; ish vaqti Asia/Tashkent boʻyicha, yarim tundan oʻtadigan oraliqlar (ADR-0010). — 3.2–3.3
- [x] Qidiruv: lotin va kirill yozuvi, tutuq belgilari (ʻ ʼ ' `) farqsiz — frontenddagi `src/lib/text/normalize.ts`qoidalari; PostgreSQL`unaccent` + trigram. — 3.2–3.3 (normalizatsiya ilovada + pg_trgm)
- [x] Masofa boʻyicha saralash — PostGIS; "hozir ochiq" filtri serverda Toshkent vaqti bilan. — 3.3
- [x] Telefonlar E.164 (`+998XXXXXXXXX`) ga keltiriladi. — 3.3 (soʻrovlar), 3.6 (biznes telefonlari)
- [x] Eʼlon qilish uchun joylashuv, manzil va egasining roziligi majburiy (ADR-0007). — 3.2 (DB cheklovi)
- [x] Kategoriya slug'i oʻzgarmaydi; biznesi yoki ichki kategoriyasi bor kategoriya oʻchirilmaydi (409). — 3.7 (`has_children`, `has_businesses`); nomi oʻzgarsa bizneslar qidiruv matni yangilanadi
- [x] Sharh va shikoyat biznesga ID orqali bogʻlanadi (slug oʻzgarishi ularni uzmaydi). — 3.2
- [x] Moderatsiya navbatlari — eng eskisi birinchi; chop etilgan sharh reytingni qayta hisoblaydi. — 3.7 (reyting faqat chop etilganlik holati oʻzgarganda)
- [x] Sozlamalar: `reviewsPremoderation=false` boʻlsa sharh darhol chop etiladi; `businessRequestsOpen=false` boʻlsa soʻrov `403 requests_closed`. — 3.3–3.4
- [x] Lokalizatsiya: `lang` parametri boʻyicha kategoriya/tuman nomlari; "Oʻchirilgan foydalanuvchi" yorligʻi ham tilga mos. — 3.3

## 5. Rasmlar

- [x] JPEG/PNG/WebP, 5 MB gacha, biznesga 12 tagacha; serverda qayta kodlash (EXIF, jumladan GPS, olib tashlanadi), oʻlcham tekshiruvi. — 3.6 (Pillow: faqat shu 3 format dekoderi, WebP'ga qayta kodlash, 2000 px, 40 MP chegarasi, kamida 200 px)
- [ ] Saqlash — Oʻzbekistondagi disk yoki S3-mos xotira; `X-Content-Type-Options: nosniff`, oʻzgarmas kesh (`immutable`). — lokal disk va ishlab chiqishda Django orqali — 3.6; production xotirasi va sarlavhalar — 5-bosqich

## 6. Kesh yangilash (frontend bilan bogʻliqlik)

O'zgarishdan keyin backend frontendning `POST /api/revalidate` webhook'ini chaqiradi (`Authorization: Bearer $REVALIDATE_SECRET`, `{"tags": [...]}`, koʻpi bilan 50 ta).

| O'zgarish             | Teglar                                                               |
| --------------------- | -------------------------------------------------------------------- |
| Biznes, rasm, katalog | `businesses`, `business:{slug}` (+ kategoriya oʻzgarsa `categories`) |
| Sharh moderatsiyasi   | `businesses`, `business:{slug}`, `reviews:{slug}`                    |
| Kategoriya            | `categories`, `category:{slug}`, `businesses`                        |
| Sozlamalar            | `settings`                                                           |

Demo rejimda xuddi shu teglar `x-demo-revalidate` sarlavhasi orqali yangilanadi (`frontend/src/app/api/v1/[...path]/route.ts`).

## 7. Statistika va hisobot havolasi

- [x] Hodisalar (`profile_view`, `call_click`, `telegram_click`, `direction_click`) — kunlik agregat jadval (`business_id`, `date`, sonlar); IP, user-agent va boshqa shaxsiy maʼlumot **saqlanmaydi**. — 3.3
- [x] Hisobot tokeni ~250 bit tasodifiy; faqat SHA-256 xeshi saqlanadi; yangisi eskisini bekor qiladi; javob `Cache-Control: no-store`, `Referrer-Policy: no-referrer`; ochilishlar soni va oxirgi vaqt. — 3.8

## 8. Maxfiylik siyosatidagi vaʼdalar (bajarilishi shart)

[Maxfiylik siyosati](../frontend/src/content/legal.ts) matni foydalanuvchiga quyidagilarni vaʼda qiladi — backend ularni amalda taʼminlashi kerak:

- [ ] Maʼlumotlar Oʻzbekistondagi serverlarda (ADR-0005).
- [x] "Biznesingizni qoʻshing" maʼlumotlari soʻrov yopilgandan keyin **12 oy ichida oʻchiriladi** (davriy vazifa). — 3.8 (`manage.py cleanup`; serverda kunlik ishga tushirish — 5-bosqich)
- [x] Akkaunt oʻchirilganda shaxsiy maʼlumotlar oʻchiriladi; chop etilgan sharhlar "Oʻchirilgan foydalanuvchi" nomi bilan qoladi, qolgan yozuvlar oʻchiriladi. — 3.4
- [x] Joylashuv serverda saqlanmaydi (soʻrovlardagi `lat/lng` loglanmaydi). — saqlanmaydi (3.3); access log'larda query string — 3.3 (saqlanmaydi), 3.8 (ilova loglarida query string yoʻq; reverse proxy log formati — 5-bosqich)
- [ ] Analitika va reklama cookie'lari yoʻq.

⚠ Huquqiy matnlar — loyiha: ishga tushirishdan oldin huquqshunos tekshiradi.

## 9. Integratsiya (4-bosqich) tekshiruvlari

- [ ] `npm run api:types` farqsiz (kontrakt va backend bir xil).
- [ ] Frontend E2E testlari haqiqiy backend bilan (`NEXT_PUBLIC_DEMO_MODE=false`) — demo maʼlumotga bogʻliq testlar uchun alohida seed.
- [ ] `NEXT_PUBLIC_SITE_URL` — production domeni (canonical, sitemap, OG); demo oʻchgach `robots.txt` indekslashga ruxsat beradi.
