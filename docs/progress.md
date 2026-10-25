# Ish holati

Oxirgi yangilanish: 2026-10-25

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
| 2.4   | Bosh sahifa, kategoriyalar, roʻyxat, filtrlar, qidiruv                                           | ✅ (tasdiq kutilmoqda) |
| 2.5   | Biznes profili, mahsulot sahifasi, xarita                                                        | ⏳                     |
| 2.6   | Kirish (mock), mijoz kabineti, sharhlar, sevimlilar, shikoyatlar                                 | ⏳                     |
| 2.7   | Admin: kirish+2FA, layout, bizneslar, tezkor qoʻshish, katalog, rasmlar                          | ⏳                     |
| 2.8   | Admin: kategoriyalar, moderatsiya, shikoyatlar, soʻrovlar, foydalanuvchilar                      | ⏳                     |
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

**Hali ishlamaydi:** biznes profili (`/biznes/...` — 2.5), xarita (2.5), kirish/profil/sevimlilar (2.6), admin panel (2.7–2.9), statik sahifalar va "Biznes qoʻshish" formasi (2.10).

## Maʼlum cheklovlar

- Docker kompyuterda oʻrnatilmagan — 3-bosqichda (PostgreSQL uchun) kerak boʻladi.
- Biznes kartalari, "Xarita", "Kirish", "Profil", "Sevimlilar" va footer havolalari hali yaratilmagan sahifalarga olib boradi (404) — tegishli qadamlarda paydo boʻladi.
- Build'da maʼlum boʻlmagan kategoriya slug'i baʼzan 404 oʻrniga 200 + `noindex` qaytaradi (Next 16 oqimli render xususiyati); qidiruv tizimlari indekslamaydi.
- Partial Prefetching'ning bitta prefetch soʻrovi baʼzan ochiq qoladi (foydalanuvchiga taʼsiri yoʻq); kuzatib boriladi.
