# Mock qatlam (faqat demo rejim)

⚠ Bu papkadagi hamma narsa **namunaviy**: bizneslar, narxlar, sharhlar to'qib chiqarilgan.

- `fixtures/` — demo maʼlumotlar (deterministik — testlar barqaror).
- `db.ts` — xotiradagi "maʼlumotlar bazasi": filtrlash, qidiruv, saralash, sahifalash.
- `handlers.ts` — MSW handler'lari, [docs/api/openapi.yaml](../../../docs/api/openapi.yaml) kontraktiga mos.
- `fetch.ts` — `mockFetch(request)`: so'rovni tarmoqsiz, shu handler'lar orqali javoblaydi.
- `fixtures/standard-attributes.json` — standart kategoriya xususiyatlari (backend migratsiyasi bilan bir xil, `seed_demo` va eksport orqali tekshiriladi).
- `item-attributes.ts` — mahsulot xususiyatlari (kategoriya xususiyati: tekshiruv, tilga moslash) — backend `apps/businesses/attributes.py` bilan bir xil (ADR-0014).

## Biznes egasi kabineti (demo)

- `cabinet-handlers.ts` — `/cabinet/*` va admin `POST/DELETE /admin/businesses/{id}/owner-invite` (backend `apps/cabinet` qoidalari: taklif havolasi bir martalik, 7 kun, faqat SHA-256 xeshi; ko'pi bilan 3 ega; takliflar admin bilan bir xil tekshiriladi — `applyProfileFields`, `parseItem`; shu nishondagi eski taklif almashtiriladi; 20 ta kutilayotgan taklif, 40 ta rasm).
- ⚠ Demo: taklif rasmining o'lchami o'lchanmaydi (namunaviy 1200×900); hamma narsa xotirada. Admin tomoni (egalar ro'yxati, takliflarni tasdiqlash) — 6.4-qadamda.

## Backend bilan bir xil maʼlumot

Fixture'lar `scripts/export-demo-data.ts` orqali `backend/demo/demo-data.json` ga eksport qilinadi — backend `manage.py seed_demo` aynan shu maʼlumotni yuklaydi, E2E testlar ikkala rejimda bir xil natija kutadi. Fixture oʻzgarsa, eksportni qayta ishga tushiring.

## Admin kirishi (demo)

- Hamma demo administratorlar uchun kod — `123456` (`totpCode`); parollar ochiq matnda. Backendda — Argon2 xeshi va har bir admin uchun shifrlangan TOTP kaliti.
- Root qoʻshgan yoki paroli tiklangan administrator birinchi kirishda `next: setup` oladi: yangi parol → `/admin/auth/setup` → kod. Javobdagi kalit (`DEMODEMODEMODEMO`) va QR — belgi, haqiqiy emas.
- Bloklash faqat login boʻyicha va 1 daqiqaga (backendda — IP + login, 15 daqiqa).

Ilova kodi bu papkani **to'g'ridan-to'g'ri import qilmaydi** — faqat `src/lib/api/server.ts`
demo rejimida `mockFetch` ni ulaydi. Demo rejim o'chirilsa (`NEXT_PUBLIC_DEMO_MODE=false`),
so'rovlar `API_URL` dagi haqiqiy backendga ketadi. Qarang: ADR-0011.
