# Yaqin — frontend

Next.js (App Router) + TypeScript ilovasi. Umumiy maʼlumot, arxitektura va qarorlar — [asosiy README](../README.md) va [docs/adr](../docs/adr).

## Buyruqlar

| Buyruq              | Vazifasi                                                   |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Ishlab chiqish serveri — <http://localhost:3000>           |
| `npm run build`     | Production build                                           |
| `npm run start`     | Build'ni ishga tushirish                                   |
| `npm run lint`      | ESLint                                                     |
| `npm run typecheck` | Route tiplarini generatsiya qilish + TypeScript tekshiruvi |
| `npm run format`    | Prettier bilan formatlash                                  |
| `npm test`          | Unit testlar (Vitest)                                      |
| `npm run e2e`       | E2E testlar (Playwright, avval `npm run build` kerak)      |
| `npm run check`     | lint + typecheck + format + unit testlar                   |

## Tuzilma

```text
src/
├── app/[locale]/   sahifalar (uz — prefikssiz, ru — /ru)
│   └── (public)/   ommaviy sahifalar (header, footer, pastki navigatsiya)
├── components/
│   ├── ui/         shadcn/Radix asosiy komponentlari
│   └── common/     umumiy: karkas, holatlar, til almashtirgich
├── content/        uzun matnlar (foydalanish shartlari, maxfiylik siyosati)
├── features/       soha modullari: admin, business, category, reviews, stats, ...
├── i18n/           til sozlamalari (next-intl)
├── lib/            yordamchi funksiyalar: API klient, formatlash, SEO
└── mocks/          demo API (MSW): handler'lar, demo holat, fixtures, testlar
messages/           tarjimalar: uz.json, ru.json
e2e/                Playwright testlari (375 / 768 / 1280 px)
```

## Muhit oʻzgaruvchilari

Namuna — [`.env.example`](.env.example).

| Oʻzgaruvchi                 | Vazifasi                                                                   |
| --------------------------- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`      | Ommaviy manzil: canonical, sitemap, Open Graph                             |
| `NEXT_PUBLIC_DEMO_MODE`     | `false` boʻlmasa — mock maʼlumotlar, demo ogohlantirishi, indekslash yopiq |
| `API_URL`                   | Backend manzili (server tomoni, demo oʻchganda)                            |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Xarita uslubi (standart — OpenFreeMap)                                     |
| `REVALIDATE_SECRET`         | Backend kesh yangilash webhook'i (`POST /api/revalidate`)                  |

## Muhim kelishuvlar

- **Next.js 16.4** — `middleware` oʻrniga `src/proxy.ts`; `cacheComponents` yoqilgan. Kod yozishdan oldin `node_modules/next/dist/docs/` dagi hujjatlarni tekshiring (qarang: `AGENTS.md`).
- Ichki havolalar uchun `next/link` emas, `@/i18n/navigation` dagi `Link` ishlatiladi.
- Oʻzbekcha matnlarda `ʻ` (U+02BB) va `ʼ` (U+02BC) belgilari ishlatiladi.
- Narxlar tiyinda, butun son. Formatlash — `src/lib/format/price.ts`.
- MapLibre worker `predev`/`prebuild` da `public/vendor/` ga koʻchiriladi (`scripts/copy-vendor.mjs`) — bu papka Git'ga kirmaydi.
- API tiplari `docs/api/openapi.yaml` dan: `npm run api:types` (`src/lib/api/schema.d.ts` ni qoʻlda tahrirlamang).
- Har bir oʻzgaruvchi admin harakati kesh teglarini yangilaydi (`businesses`, `business:{slug}`, `categories`, `settings` ...).
- **Tarjimalar:** ommaviy layout `Admin` namespace'ini brauzerga yubormaydi (tarjimalarning ~58 %); admin matnlari faqat `app/[locale]/admin/layout.tsx` dagi provider orqali. Ommaviy client komponentda `useTranslations("Admin…")` ishlatmang.
- **`generateStaticParams`** Cache Components rejimida kamida bitta natija qaytarishi shart — boʻlishi mumkin boʻlsa `atLeastOne()` (`src/lib/static-params.ts`) bilan oʻrang (yangi bazada bizneslar yoʻq, mahsuloti yoʻq biznes bor).
- Dizayn tizimi va komponentlar — [docs/design-system.md](../docs/design-system.md), jonli koʻrinish: `/dev/ui`.
