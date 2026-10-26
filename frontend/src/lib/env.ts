/**
 * Demo rejim: maʼlumotlar mock handler'lardan keladi va har bir sahifada ogohlantirish ko'rinadi.
 * Xavfsiz standart — faqat NEXT_PUBLIC_DEMO_MODE="false" bo'lsa o'chadi (ADR-0011).
 * Mock va ogohlantirish bitta bayroqqa bog'langan: mock maʼlumot ogohlantirishsiz ko'rinmaydi.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

/**
 * "Demo foydalanuvchi sifatida kirish" tugmasi: demo rejimda doim; haqiqiy backend bilan — faqat
 * ishlab chiqish va E2E uchun (`NEXT_PUBLIC_DEMO_LOGIN=true`, backendda `DEMO_LOGIN_ENABLED` faqat
 * DEBUG'da). Productionda o'rnatilmaydi — backend baribir 404 qaytaradi.
 */
export const isDemoLoginEnabled = isDemoMode || process.env.NEXT_PUBLIC_DEMO_LOGIN === "true";
