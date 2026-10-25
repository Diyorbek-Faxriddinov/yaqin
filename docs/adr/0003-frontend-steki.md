# 0003. Frontend steki

- **Holat:** Qabul qilingan
- **Sana:** 2026-10-25

## Kontekst

Ommaviy katalog sahifalari qidiruv tizimlarida topilishi kerak (SEO), telefonda tez ochilishi kerak, ikki tilda (uz, ru) ishlashi kerak. Backend hali yoʻq — frontend avval mock maʼlumotlar bilan quriladi.

## Qaror

| Masala        | Tanlov                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router), `cacheComponents` va `partialPrefetching` yoqilgan      |
| Til           | TypeScript (`strict`, `noUncheckedIndexedAccess`)                                |
| Stil          | Tailwind CSS 4 + shadcn/ui (Radix) — 2.2-qadamda                                 |
| Server holati | TanStack Query                                                                   |
| Mijoz holati  | Minimal (Zustand), filtrlar URL'da                                               |
| Formlar       | React Hook Form + Zod                                                            |
| Tillar        | next-intl; `uz` prefikssiz, `ru` — `/ru`; til `next/root-params` orqali oʻqiladi |
| API           | OpenAPI kontraktidan generatsiya qilingan tiplangan klient                       |
| Mock          | Alohida mock-server (MSW handler'lari); frontend faqat `API_URL` ni biladi       |
| Testlar       | Vitest + Testing Library, Playwright (375/768/1280 px), axe                      |
| Xarita        | MapLibre + OpenStreetMap asosidagi bepul tile'lar                                |

## Koʻrib chiqilgan muqobillar

- **Nuxt (Vue)** — yaxshi, lekin ekotizim va mahalliy dasturchilar bozori kichikroq.
- **SPA (Vite + React)** — SEO uchun yaroqsiz.
- **Astro** — interaktiv admin panel uchun noqulay.
- **MUI / Ant Design** — ogʻirroq, dizaynni moslashtirish qiyin.
- **Yandex Maps API** — Toshkentda aniqroq, lekin tijoriy litsenziya talab qilishi mumkin; yoʻl koʻrsatish uchun Yandex/Google xaritalarga oddiy havola yetarli.

## Oqibatlar

- Next.js 16.4 ning API'lari oldingi versiyalardan farq qiladi (`proxy.ts`, asinxron `params`, `use cache`) — kod yozishda `node_modules/next/dist/docs/` ga tayaniladi.
- `cacheComponents` sababli APIʼdan maʼlumot olayotgan komponentlar `Suspense` ichida yoki `'use cache'` bilan yoziladi.
- Mock rejimida interfeysda "Demo rejim" belgisi koʻrsatiladi — mock maʼlumot haqiqiy deb koʻrsatilmaydi.
