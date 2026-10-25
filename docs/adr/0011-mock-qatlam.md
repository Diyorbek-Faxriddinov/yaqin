# 0011. Mock qatlam: jarayon ichidagi MSW handler'lari

- **Holat:** Qabul qilingan (ADR-0003 dagi "alohida mock-server" bandini almashtiradi)
- **Sana:** 2026-10-25

## Kontekst

Backend 3-bosqichda quriladi; frontend hozir demo maʼlumotlar bilan ishlashi kerak. ADR-0003 da alohida mock-server rejalashtirilgan edi. Lekin Next.js 16 (`cacheComponents`) sahifalarni **build vaqtida** oldindan render qiladi: alohida server bo'lsa, `npm run build` va CI uchun u ham ishlab turishi shart bo'lardi.

## Qaror

- API kontrakti — `docs/api/openapi.yaml`; frontend tiplari undan generatsiya qilinadi (`npm run api:types`), CI ularning mosligini tekshiradi.
- Mock — MSW handler'lari (`src/mocks/handlers.ts`), xotiradagi demo "baza" (`src/mocks/db.ts`).
- Server API klienti (`src/lib/api/server.ts`, openapi-fetch) demo rejimida `fetch` o'rniga `mockFetch` ni ishlatadi: so'rov MSW `getResponse()` orqali **tarmoqsiz** javoblanadi. Mock kodi faqat demo rejimida yuklanadi.
- Demo rejim va "Demo rejim" ogohlantirishi **bitta bayroqqa** bog'langan (`NEXT_PUBLIC_DEMO_MODE`, standart — yoqilgan). Mock maʼlumot ogohlantirishsiz ko'rinishi mumkin emas.
- Backend tayyor bo'lganda: `NEXT_PUBLIC_DEMO_MODE=false`, `API_URL=<backend>` — ilova kodi o'zgarmaydi.
- Brauzerdan to'g'ridan-to'g'ri so'rovlar kerak bo'lganda (2.6-qadam: sevimlilar, sharhlar) — `/api/v1/*` route handler orqali xuddi shu handler'lar ishlatiladi; productionda bu yo'l backendga proksi qilinadi.

## Koʻrib chiqilgan muqobillar

- **Alohida mock-server** — build va CI uchun qo'shimcha jarayon; ishga tushirish murakkablashadi.
- **Next.js route handler'lar orqali o'z-o'ziga HTTP so'rov** — build vaqtida server yo'q, ishlamaydi.
- **Komponentlarda statik JSON import qilish** — kontraktni chetlab o'tadi, backendga o'tishda kod qayta yoziladi.

## Oqibatlar

- Bitta jarayon: `npm run dev`, `npm run build`, E2E — qo'shimcha sozlamasiz.
- Mock handler'lari kontraktning bajariladigan namunasi: backend xuddi shu natijalarni qaytarishi kerak (`src/mocks/handlers.test.ts`).
- MSW so'rov ID uchun `Math.random()` ishlatadi — keshlanmaydigan so'rovlar oldidan `connection()` chaqiriladi.
