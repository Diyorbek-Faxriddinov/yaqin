# Ish holati

Oxirgi yangilanish: 2026-10-26

## Bosqichlar

| Bosqich | Mazmuni                           | Holat           |
| ------- | --------------------------------- | --------------- |
| 0       | Gʻoya tahlili, arxitektura        | ✅ Tasdiqlangan |
| 1       | Frontend rejasi                   | ✅ Tasdiqlangan |
| 2       | Frontend ishlab chiqish           | 🔄 Jarayonda    |
| 3       | Backend                           | ⏳              |
| 4       | Integratsiya va yakuniy tekshiruv | ⏳              |
| 5       | Hosting va domen                  | ⏳              |

## 2-bosqich qadamlari

| Qadam | Mazmuni                                                                                          | Holat                  |
| ----- | ------------------------------------------------------------------------------------------------ | ---------------------- |
| 2.1   | Poydevor: Next.js, TS, ESLint/Prettier, Tailwind, next-intl, Vitest, Playwright, CI, README, ADR | ✅                     |
| 2.2   | Dizayn tizimi, umumiy komponentlar, layoutlar                                                    | ✅                     |
| 2.3   | OpenAPI kontrakti, generatsiya, mock qatlam, demo maʼlumotlar                                    | ✅                     |
| 2.4   | Bosh sahifa, kategoriyalar, roʻyxat, filtrlar, qidiruv                                           | ✅                     |
| 2.5   | Biznes profili, mahsulot sahifasi, xarita                                                        | ✅                     |
| 2.6   | Kirish (mock), mijoz kabineti, sharhlar, sevimlilar, shikoyatlar                                 | ✅                     |
| 2.7   | Admin: kirish+2FA, layout, bizneslar, tezkor qoʻshish, katalog, rasmlar                          | ✅                     |
| 2.8   | Admin: kategoriyalar, moderatsiya, shikoyatlar, soʻrovlar, foydalanuvchilar                      | ✅ (tasdiq kutilmoqda) |
| 2.9   | Admin: administratorlar, rollar, audit, sozlamalar, statistika, hisobot havolasi                 | ⏳                     |
| 2.10  | Statik sahifalar, SEO, a11y, tezlik, hujjatlar                                                   | ⏳                     |

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

## Maʼlum cheklovlar

- Docker kompyuterda oʻrnatilmagan — 3-bosqichda (PostgreSQL uchun) kerak boʻladi.
- Footer havolalari hali yaratilmagan sahifalarga olib boradi (404) — tegishli qadamlarda paydo boʻladi.
- Build'da maʼlum boʻlmagan kategoriya slug'i baʼzan 404 oʻrniga 200 + `noindex` qaytaradi (Next 16 oqimli render xususiyati); qidiruv tizimlari indekslamaydi.
- Partial Prefetching'ning bitta prefetch soʻrovi baʼzan ochiq qoladi (foydalanuvchiga taʼsiri yoʻq); kuzatib boriladi.
- Xarita yorliqlari OpenStreetMap maʼlumotlaridan (koʻpincha lotin/ingliz yozuvida) — tile provayderi bilan bogʻliq.
- Demo bizneslarda Telegram yoʻq (mavjud boʻlishi mumkin boʻlgan akkauntlarni ishlatmaslik uchun) — tugma maʼlumot boʻlganda chiqadi.
- Demo foydalanuvchilar, sevimlilar, sharhlar va xabarlar server xotirasida — qayta ishga tushganda o'chadi.
- Telegram/Google orqali kirish — backend bilan birga (4-bosqich).
