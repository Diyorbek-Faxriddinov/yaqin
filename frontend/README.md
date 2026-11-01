# Yaqin — frontend

Next.js (App Router) + TypeScript ilovasi. Umumiy maʼlumot, arxitektura va qarorlar — [asosiy README](../README.md) va [docs/adr](../docs/adr).

## Buyruqlar

| Buyruq                | Vazifasi                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`         | Ishlab chiqish serveri — <http://localhost:3000>                                                                        |
| `npm run build`       | Production build                                                                                                        |
| `npm run start`       | Build'ni ishga tushirish                                                                                                |
| `npm run lint`        | ESLint                                                                                                                  |
| `npm run typecheck`   | Route tiplarini generatsiya qilish + TypeScript tekshiruvi                                                              |
| `npm run format`      | Prettier bilan formatlash                                                                                               |
| `npm test`            | Unit testlar (Vitest)                                                                                                   |
| `npm run e2e`         | E2E testlar demo rejimda (Playwright, avval `npm run build` kerak)                                                      |
| `npm run e2e:backend` | E2E testlar haqiqiy backend bilan: `yaqin_e2e` bazasi noldan, alohida build (`.next-backend`), Caddy → Django + Next.js |
| `npm run check`       | lint + typecheck + format + unit testlar                                                                                |

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
e2e/                Playwright testlari (375 / 768 / 1280 px); support/ — admin kirishi, TOTP, rejim
scripts/            build yordamchilari; export-demo-data.ts — demo maʼlumotlarni backend'ga, e2e-backend.mjs
```

## Muhit oʻzgaruvchilari

Namuna — [`.env.example`](.env.example).

| Oʻzgaruvchi                    | Vazifasi                                                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`         | Ommaviy manzil: canonical, sitemap, Open Graph                                                                                                  |
| `NEXT_PUBLIC_DEMO_MODE`        | `false` boʻlmasa — mock maʼlumotlar, demo ogohlantirishi, indekslash yopiq                                                                      |
| `API_URL`                      | Backend manzili (server tomoni, demo oʻchganda)                                                                                                 |
| `API_TIMEOUT_MS`               | Server tomonidagi API soʻrovining vaqt chegarasi (standart 10000) — oshsa, xato sahifasi ("Qayta urinish")                                      |
| `NEXT_PUBLIC_MAP_STYLE_URL`    | Xarita uslubi (standart — OpenFreeMap)                                                                                                          |
| `REVALIDATE_SECRET`            | Backend kesh yangilash webhook'i (`POST /api/revalidate`)                                                                                       |
| `NEXT_PUBLIC_TELEGRAM_BOT`     | Telegram bot nomi (`@` siz) — kirish vidjeti; tokeni faqat backendda. Sozlash: [docs/auth-setup.md](../docs/auth-setup.md)                      |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID — kirish tugmasi (backend `GOOGLE_CLIENT_ID` bilan bir xil)                                                              |
| `NEXT_PUBLIC_DEMO_LOGIN`       | `true` — haqiqiy backend bilan ham "Demo foydalanuvchi" tugmasi (faqat ishlab chiqish va E2E; backendda `DEMO_LOGIN_ENABLED` faqat DEBUG)       |
| `NEXT_DIST_DIR`                | Build papkasi (standart `.next`; backend E2E — `.next-backend`; `start.ps1 -Prod` — `.next-local`; resilience E2E nusxasi — `.next-resilience`) |

## Muhim kelishuvlar

- **Next.js 16.4** — `middleware` oʻrniga `src/proxy.ts`; `cacheComponents` yoqilgan. Kod yozishdan oldin `node_modules/next/dist/docs/` dagi hujjatlarni tekshiring (qarang: `AGENTS.md`).
- Ichki havolalar uchun `next/link` emas, `@/i18n/navigation` dagi `Link` ishlatiladi.
- **Xavfsizlik sarlavhalari** (CSP, Permissions-Policy) — `src/lib/security-headers.ts`, ADR-0013. Yangi tashqi manba (skript, rasm, API, iframe) qoʻshilsa — shu yerga aniq qoʻshing, aks holda brauzer bloklaydi; `e2e/security.spec.ts` buzilishlarni ushlaydi.
- Oʻzbekcha matnlarda `ʻ` (U+02BB) va `ʼ` (U+02BC) belgilari ishlatiladi.
- Narxlar tiyinda, butun son. Formatlash — `src/lib/format/price.ts`.
- MapLibre worker `predev`/`prebuild` da `public/vendor/` ga koʻchiriladi (`scripts/copy-vendor.mjs`) — bu papka Git'ga kirmaydi.
- API tiplari `docs/api/openapi.yaml` dan: `npm run api:types` (`src/lib/api/schema.d.ts` ni qoʻlda tahrirlamang).
- Har bir oʻzgaruvchi admin harakati kesh teglarini yangilaydi (`businesses`, `business:{slug}`, `categories`, `settings` ...). Yangilash faqat `src/lib/revalidate-tags.ts` orqali: `business:*`/`category:*` da marshrut ham yangilanadi (notFound() natijasi tegga bogʻlanmaydi), route handler'larda `revalidateTagsRepeated` — eski maʼlumot qayta yozilishiga qarshi 3, 10 va 30 s dan keyin takror (Next `use cache` toʻldirishlarini soʻrovlararo boʻlishadi).
- **Zod** `jitless` rejimida (`src/lib/zod-config.ts`, `query-provider.tsx` da import qilinadi) — aks holda Zod `eval` ishlatadi va CSP uni bloklaydi. Importni olib tashlamang.
- Kirish talab qiladigan sahifalarga (`/profil...`) ommaviy sahifalardagi havolalar `prefetch={false}` bilan: kirilmagan foydalanuvchi uchun oldindan yuklash yoʻnaltirilib 404 oladi (proxy prefetch'ni ajrata olmaydi — Next sarlavhalarini olib tashlaydi).
- **Til almashtirgich — oddiy `<a>`, Next `Link` emas.** Next `/ru` havolasidan `/[locale]` qolipini oʻrganib, prefikssiz oʻzbekcha manzillarni (`/haqida`) bosh sahifa deb taxmin qiladi va prefetch'da 404 oladi. Boshqa til manzillariga ham `Link` ishlatmang (`e2e/shell.spec.ts` ushlaydi).
- Server sahifalaridagi API xatolari `error.tsx` → `RouteError` (`src/components/common/route-error.tsx`) ga tushadi; backend vaqtida javob bermasa — `BackendUnavailableError` (`src/lib/api/backend-fetch.ts`).
- **Backend soʻrovlari faqat `createBackendFetch` orqali** (`src/lib/api/server.ts` dagi `api`, rasm proksisi ham): vaqt chegarasi taymer bilan poygada — Next eskirgan keshni fonda qayta toʻldirganda `signal` ni olib tashlaydi, oddiy `AbortSignal` bilan soʻrov abadiy kutardi. Toʻgʻridan-toʻgʻri `fetch(API_URL…)` yozmang.
- **`use cache` ishlovchisi** — `cache-handler.mjs` (Next'ning standarti + tuzatish): Next 16.4.3 da xato bilan tugagan kesh toʻldirishi kalitni abadiy band qilardi (backend bir marta uzilsa, sahifalar ochilmay qolardi). Next yangilanganda `src/lib/cache-handler.test.ts` dagi "standart ishlovchi hali ham osilib qoladi" testi yiqilsa — xato tuzatilgan, oʻramni olib tashlash mumkin.
- **Siqish Next'da oʻchirilgan** (`compress: false`) — reverse proxy siqadi (Caddy `encode zstd gzip`; productionda ham shart). Next'ning gzip'i xato bilan tugagan oqimli javobni baʼzan yopmasdi.
- **Tarjimalar:** ommaviy layout `Admin` namespace'ini brauzerga yubormaydi (tarjimalarning ~58 %); admin matnlari faqat `app/[locale]/admin/layout.tsx` dagi provider orqali. Ommaviy client komponentda `useTranslations("Admin…")` ishlatmang.
- **`generateStaticParams`** Cache Components rejimida kamida bitta natija qaytarishi shart — boʻlishi mumkin boʻlsa `atLeastOne()` (`src/lib/static-params.ts`) bilan oʻrang (yangi bazada bizneslar yoʻq, mahsuloti yoʻq biznes bor).
- **Production** — `Dockerfile` (standalone, `NEXT_OUTPUT=standalone`), [docs/deployment.md](../docs/deployment.md). `NEXT_PUBLIC_*` build vaqtida yoziladi; build backendga ulanadi. `HOSTNAME=0.0.0.0` shart (aks holda bosh sahifa o'ziga 307 bilan yo'naltiriladi). Rasm optimizatori fayllarni `MEDIA_INTERNAL_URL` dan oladi (`src/lib/api/media-url.ts`; Django productionda rasm bermaydi).
- **Rasmlar galereyasi** — `src/components/common/media-gallery.tsx` (biznes va mahsulot sahifalari): rasm hech qachon kesilmaydi (`object-contain` + xiralashtirilgan fon). Admin rasm yuklash — `features/admin/components/photo-manager.tsx` (biznes va mahsulot uchun umumiy, brauzerda siqadi).
- **Biznes qulayliklari** — tartib `src/lib/amenities.ts` da (kontrakt bilan bir xil), ikonkalar va ro'yxat — `features/business/components/amenities.tsx`, nomlar — `Amenities` namespace.
- **Mahsulot xususiyatlari** (ADR-0014): kategoriya xususiyati — `key` va xom qiymat bilan yuboriladi, nom va qiymatni backend soʻralgan tilda qaytaradi; mock'dagi qoidalar `src/mocks/item-attributes.ts` — backend `apps/businesses/attributes.py` bilan bir xil saqlang.
- Dizayn tizimi va komponentlar — [docs/design-system.md](../docs/design-system.md), jonli koʻrinish: `/dev/ui`.

## E2E: ikki rejim

- **Demo** (`npm run build && npm run e2e`) — mock API, tez, tashqi talab yoʻq. CI'da har push'da.
- **Haqiqiy backend** (`npm run e2e:backend`) — PostgreSQL + PostGIS, backend muhiti (`backend/.venv` yoki `BACKEND_PYTHON`) va Caddy (`D:\tools\caddy\caddy.exe` yoki `CADDY_BIN`) kerak. Skript `yaqin_e2e` bazasini noldan tayyorlaydi (`manage.py e2e_prepare`), demo rejimsiz build qiladi va testlarni Caddy (8091) → Django (8001) + Next.js (3101) orqali ishlatadi. CI'da — `.github/workflows/integration.yml` (frontend, backend yoki kontrakt oʻzgarganda; PostgreSQL + Redis, Caddy versiyasi va xeshi mahkamlangan).
- Admin kirishi: demo'da forma orqali (kod `123456`); backendda setup project (`e2e/backend.setup.ts`) haqiqiy TOTP bilan bir marta kiradi, testlar sessiyani ulaydi — backend bir kodni qayta qabul qilmaydi. Yangi testlarda `adminLogin()` (`e2e/support/admin.ts`) ishlating.
- **`resilience`** project (faqat backend rejimida): Next.js (3102, build nusxasi `.next-resilience` — 3101 bilan umumiy ish vaqti keshi boʻlmasin) javob bermaydigan portga (8009) ulanadi, `API_TIMEOUT_MS=1500` — xato sahifalari tekshiriladi (`e2e/resilience.spec.ts`).
- Admin oʻzgarishidan keyingi kesh testlari (`e2e/cache-revalidation.spec.ts`) sahifani qayta yuklab kutadi (`eventually`, 15 s) — yuklama ostida takroriy yangilash kerak boʻlishi mumkin. Boshqa testlar sanaydigan kategoriya/tumanlarga maʼlumot qoʻshmang.
- Rejimga bogʻliq tekshiruv: `isBackend` (`e2e/support/backend.ts`). Demo maʼlumot fixture'lari oʻzgarsa — `npx jiti scripts/export-demo-data.ts` (backend `seed_demo` shu faylni yuklaydi).
