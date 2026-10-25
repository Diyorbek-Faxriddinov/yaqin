# Mock qatlam (faqat demo rejim)

⚠ Bu papkadagi hamma narsa **namunaviy**: bizneslar, narxlar, sharhlar to'qib chiqarilgan.

- `fixtures/` — demo maʼlumotlar (deterministik — testlar barqaror).
- `db.ts` — xotiradagi "maʼlumotlar bazasi": filtrlash, qidiruv, saralash, sahifalash.
- `handlers.ts` — MSW handler'lari, [docs/api/openapi.yaml](../../../docs/api/openapi.yaml) kontraktiga mos.
- `fetch.ts` — `mockFetch(request)`: so'rovni tarmoqsiz, shu handler'lar orqali javoblaydi.

Ilova kodi bu papkani **to'g'ridan-to'g'ri import qilmaydi** — faqat `src/lib/api/server.ts`
demo rejimida `mockFetch` ni ulaydi. Demo rejim o'chirilsa (`NEXT_PUBLIC_DEMO_MODE=false`),
so'rovlar `API_URL` dagi haqiqiy backendga ketadi. Qarang: ADR-0011.
