# Mock qatlam (faqat demo rejim)

⚠ Bu papkadagi hamma narsa **namunaviy**: bizneslar, narxlar, sharhlar to'qib chiqarilgan.

- `fixtures/` — demo maʼlumotlar (deterministik — testlar barqaror).
- `db.ts` — xotiradagi "maʼlumotlar bazasi": filtrlash, qidiruv, saralash, sahifalash.
- `handlers.ts` — MSW handler'lari, [docs/api/openapi.yaml](../../../docs/api/openapi.yaml) kontraktiga mos.
- `fetch.ts` — `mockFetch(request)`: so'rovni tarmoqsiz, shu handler'lar orqali javoblaydi.
- `fixtures/standard-attributes.json` — standart kategoriya xususiyatlari (backend migratsiyasi bilan bir xil, `seed_demo` va eksport orqali tekshiriladi).
- `item-attributes.ts` — mahsulot xususiyatlari (kategoriya xususiyati: tekshiruv, tilga moslash) — backend `apps/businesses/attributes.py` bilan bir xil (ADR-0014).

## Backend bilan bir xil maʼlumot

Fixture'lar `scripts/export-demo-data.ts` orqali `backend/demo/demo-data.json` ga eksport qilinadi — backend `manage.py seed_demo` aynan shu maʼlumotni yuklaydi, E2E testlar ikkala rejimda bir xil natija kutadi. Fixture oʻzgarsa, eksportni qayta ishga tushiring.

## Admin kirishi (demo)

- Hamma demo administratorlar uchun kod — `123456` (`totpCode`); parollar ochiq matnda. Backendda — Argon2 xeshi va har bir admin uchun shifrlangan TOTP kaliti.
- Root qoʻshgan yoki paroli tiklangan administrator birinchi kirishda `next: setup` oladi: yangi parol → `/admin/auth/setup` → kod. Javobdagi kalit (`DEMODEMODEMODEMO`) va QR — belgi, haqiqiy emas.
- Bloklash faqat login boʻyicha va 1 daqiqaga (backendda — IP + login, 15 daqiqa).

Ilova kodi bu papkani **to'g'ridan-to'g'ri import qilmaydi** — faqat `src/lib/api/server.ts`
demo rejimida `mockFetch` ni ulaydi. Demo rejim o'chirilsa (`NEXT_PUBLIC_DEMO_MODE=false`),
so'rovlar `API_URL` dagi haqiqiy backendga ketadi. Qarang: ADR-0011.
