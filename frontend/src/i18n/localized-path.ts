import { routing, type AppLocale } from "./routing";

/**
 * Tilsiz yo'lni (masalan "/kategoriya/avto") berilgan til uchun to'liq yo'lga aylantiradi.
 * Asosiy til prefikssiz (localePrefix: "as-needed"): uz → "/kategoriya/avto", ru → "/ru/kategoriya/avto".
 *
 * next-intl'ning Link'i boshqa tilga o'tishda asosiy til uchun ham "/uz/..." prefiksini
 * qo'yadi va proxy'dagi qayta yo'naltirishga tayanadi; client navigatsiyada bu yo'naltirish
 * ba'zan o'tkazib yuborilib, URL "/uz" bo'lib qolardi. Shuning uchun til almashtirgich shu
 * funksiyadan foydalanadi.
 */
export function localizedPath(pathname: string, locale: AppLocale): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === routing.defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
