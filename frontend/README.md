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
├── i18n/           til sozlamalari (next-intl)
└── lib/            umumiy yordamchi funksiyalar
messages/           tarjimalar: uz.json, ru.json
e2e/                Playwright testlari (375 / 768 / 1280 px)
```

## Muhim kelishuvlar

- **Next.js 16.4** — `middleware` oʻrniga `src/proxy.ts`; `cacheComponents` yoqilgan. Kod yozishdan oldin `node_modules/next/dist/docs/` dagi hujjatlarni tekshiring (qarang: `AGENTS.md`).
- Ichki havolalar uchun `next/link` emas, `@/i18n/navigation` dagi `Link` ishlatiladi.
- Oʻzbekcha matnlarda `ʻ` (U+02BB) va `ʼ` (U+02BC) belgilari ishlatiladi.
- Narxlar tiyinda, butun son. Formatlash — `src/lib/format/price.ts`.
