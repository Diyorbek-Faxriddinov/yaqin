import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "ru"],
  defaultLocale: "uz",
  // Asosiy til (uz) URL'da prefikssiz: /kategoriyalar, rus tili: /ru/kategoriyalar
  localePrefix: "as-needed",
  // Til faqat URL'dan aniqlanadi: "/" har doim o'zbekcha, "/ru" — ruscha.
  // Cookie/Accept-Language bo'yicha avtomatik yo'naltirish o'chirilgan: u /uz → / qayta
  // yo'naltirishlarini keltirib chiqaradi va qidiruv tizimlari uchun noqulay.
  localeDetection: false,
  localeCookie: false,
});

export type AppLocale = (typeof routing.locales)[number];
