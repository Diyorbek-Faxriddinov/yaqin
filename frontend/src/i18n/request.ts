import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

export default getRequestConfig(async ({ locale: explicitLocale }) => {
  // getTranslations({ locale }) kabi aniq berilgan til ustun turadi
  // (masalan, 'use cache' funksiyalari ichida yoki Server Action'larda)
  const locale = explicitLocale ?? (await rootParams.locale());

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return {
    locale,
    timeZone: "Asia/Tashkent",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
