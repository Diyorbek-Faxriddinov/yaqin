import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uz", "ru"],
  defaultLocale: "uz",
  // Asosiy til (uz) URL'da prefikssiz: /kategoriyalar, rus tili: /ru/kategoriyalar
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
