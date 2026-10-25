/**
 * Demo rejim: maʼlumotlar mock handler'lardan keladi va har bir sahifada ogohlantirish ko'rinadi.
 * Xavfsiz standart — faqat NEXT_PUBLIC_DEMO_MODE="false" bo'lsa o'chadi (ADR-0011).
 * Mock va ogohlantirish bitta bayroqqa bog'langan: mock maʼlumot ogohlantirishsiz ko'rinmaydi.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";
