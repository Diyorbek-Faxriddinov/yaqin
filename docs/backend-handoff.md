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

- [ ] Telegram Login: `hash` ni bot tokeni bilan tekshirish, `auth_date` muddati; Google OAuth (ID token tekshiruvi).
- [ ] Mijoz sessiyasi: `sessionid` — `HttpOnly; Secure; SameSite=Lax`, 30 kun; `csrftoken` — JS oʻqiy oladigan cookie (double-submit, `X-CSRFToken`).
- [ ] Admin sessiyasi alohida: `adminsessionid` — `SameSite=Strict`, 8 soat.
- [ ] Admin parollari — Argon2; TOTP — har bir admin uchun alohida maxfiy kalit, birinchi kirishda QR orqali sozlash; vaqtinchalik parol bilan kirganda parolni almashtirish majburiy.
- [ ] Root faqat serverdagi CLI buyrugʻi bilan yaratiladi (API orqali emas).
- [ ] Bloklangan foydalanuvchi: sessiyalari darhol tugatiladi, qayta kirishda `403 account_blocked`.
- [ ] Oʻchirilgan admin (`isActive=false`) — sessiyalari tugatiladi, kirish urinishi `401` (holat oshkor qilinmaydi).

## 2. Cheklovlar (rate limiting) va suiisteʼmolga qarshi

| Endpoint                                              | Cheklov                                                                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `POST /admin/auth/login`, `/admin/auth/2fa`           | **IP + login** juftligi va IP boʻyicha umumiy chegara (faqat login boʻyicha bloklash root'ni ataylab bloklashga imkon beradi) |
| `POST /business-requests`                             | IP boʻyicha; kerak boʻlsa honeypot maydon yoki captcha                                                                        |
| `GET /reports/{token}`                                | IP boʻyicha (token taxminlashga qarshi)                                                                                       |
| `POST /events`                                        | IP boʻyicha, botlarni filtrlash                                                                                               |
| `POST /businesses/{slug}/reviews`, `POST /complaints` | foydalanuvchi boʻyicha                                                                                                        |

- [ ] Kirishsiz POST endpointlar (`/business-requests`, `/events`) mehmonda `csrftoken` boʻlmaydi — CSRF'dan ozod qilinadi, oʻrniga `Origin` tekshiruvi va cheklovlar.

## 3. Ruxsatlar va audit (ADR-0009)

- [ ] Har bir endpoint ruxsatni backendda tekshiradi (kontraktdagi `summary` da koʻrsatilgan). Interfeysdagi yashirish — faqat qulaylik.
- [ ] Administrator va rollarni oʻzgartirish — **faqat Root**; `staff.manage` — faqat koʻrish. Root API orqali oʻzgarmaydi.
- [ ] Amaldagi ruxsatlar = rollar ∪ alohida ruxsatlar; manbasi bilan qaytariladi.
- [ ] Audit jurnali **faqat qoʻshiladi**: DB darajasida UPDATE/DELETE huquqi yoʻq. Kirishlar (`auth.login`) ham yoziladi.
- [ ] Shaxsiy maʼlumotlar eng kam ruxsat bilan: soʻrovlardagi telefonlar — `business.edit`; foydalanuvchilar roʻyxatida kontaktlar qaytarilmaydi.

## 4. Maʼlumotlar va biznes qoidalari

- [ ] Pul — tiyinda, butun son; vaqt — ISO 8601; ish vaqti Asia/Tashkent boʻyicha, yarim tundan oʻtadigan oraliqlar (ADR-0010).
- [ ] Qidiruv: lotin va kirill yozuvi, tutuq belgilari (ʻ ʼ ' `) farqsiz — frontenddagi `src/lib/text/normalize.ts`qoidalari; PostgreSQL`unaccent` + trigram.
- [ ] Masofa boʻyicha saralash — PostGIS; "hozir ochiq" filtri serverda Toshkent vaqti bilan.
- [ ] Telefonlar E.164 (`+998XXXXXXXXX`) ga keltiriladi.
- [ ] Eʼlon qilish uchun joylashuv, manzil va egasining roziligi majburiy (ADR-0007).
- [ ] Kategoriya slug'i oʻzgarmaydi; biznesi yoki ichki kategoriyasi bor kategoriya oʻchirilmaydi (409).
- [ ] Sharh va shikoyat biznesga ID orqali bogʻlanadi (slug oʻzgarishi ularni uzmaydi).
- [ ] Moderatsiya navbatlari — eng eskisi birinchi; chop etilgan sharh reytingni qayta hisoblaydi.
- [ ] Sozlamalar: `reviewsPremoderation=false` boʻlsa sharh darhol chop etiladi; `businessRequestsOpen=false` boʻlsa soʻrov `403 requests_closed`.
- [ ] Lokalizatsiya: `lang` parametri boʻyicha kategoriya/tuman nomlari; "Oʻchirilgan foydalanuvchi" yorligʻi ham tilga mos.

## 5. Rasmlar

- [ ] JPEG/PNG/WebP, 5 MB gacha, biznesga 12 tagacha; serverda qayta kodlash (EXIF, jumladan GPS, olib tashlanadi), oʻlcham tekshiruvi.
- [ ] Saqlash — Oʻzbekistondagi disk yoki S3-mos xotira; `X-Content-Type-Options: nosniff`, oʻzgarmas kesh (`immutable`).

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

- [ ] Hodisalar (`profile_view`, `call_click`, `telegram_click`, `direction_click`) — kunlik agregat jadval (`business_id`, `date`, sonlar); IP, user-agent va boshqa shaxsiy maʼlumot **saqlanmaydi**.
- [ ] Hisobot tokeni ~250 bit tasodifiy; faqat SHA-256 xeshi saqlanadi; yangisi eskisini bekor qiladi; javob `Cache-Control: no-store`, `Referrer-Policy: no-referrer`; ochilishlar soni va oxirgi vaqt.

## 8. Maxfiylik siyosatidagi vaʼdalar (bajarilishi shart)

[Maxfiylik siyosati](../frontend/src/content/legal.ts) matni foydalanuvchiga quyidagilarni vaʼda qiladi — backend ularni amalda taʼminlashi kerak:

- [ ] Maʼlumotlar Oʻzbekistondagi serverlarda (ADR-0005).
- [ ] "Biznesingizni qoʻshing" maʼlumotlari soʻrov yopilgandan keyin **12 oy ichida oʻchiriladi** (davriy vazifa).
- [ ] Akkaunt oʻchirilganda shaxsiy maʼlumotlar oʻchiriladi; chop etilgan sharhlar "Oʻchirilgan foydalanuvchi" nomi bilan qoladi, qolgan yozuvlar oʻchiriladi.
- [ ] Joylashuv serverda saqlanmaydi (soʻrovlardagi `lat/lng` loglanmaydi).
- [ ] Analitika va reklama cookie'lari yoʻq.

⚠ Huquqiy matnlar — loyiha: ishga tushirishdan oldin huquqshunos tekshiradi.

## 9. Integratsiya (4-bosqich) tekshiruvlari

- [ ] `npm run api:types` farqsiz (kontrakt va backend bir xil).
- [ ] Frontend E2E testlari haqiqiy backend bilan (`NEXT_PUBLIC_DEMO_MODE=false`) — demo maʼlumotga bogʻliq testlar uchun alohida seed.
- [ ] `NEXT_PUBLIC_SITE_URL` — production domeni (canonical, sitemap, OG); demo oʻchgach `robots.txt` indekslashga ruxsat beradi.
