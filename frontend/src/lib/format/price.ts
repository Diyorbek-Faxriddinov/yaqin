import type { AppLocale } from "@/i18n/routing";

/**
 * Narxlar API'da butun son ko'rinishida, tiyinda keladi (1 so'm = 100 tiyin).
 * Float ishlatilmaydi — yaxlitlash xatolari bo'lmasligi uchun.
 */
export type Money = {
  amount: number;
  currency: "UZS";
};

const NBSP = " ";

const CURRENCY_LABEL: Record<AppLocale, string> = {
  uz: "soʻm",
  ru: "сум",
};

/**
 * Raqamni uch xonadan ajratadi: 1234567 → "1 234 567".
 * Intl.NumberFormat o'rniga qo'lda — server va brauzerda ajratuvchi belgi
 * bir xil bo'lishi kafolatlanadi (aks holda hydration farqi yuzaga keladi).
 */
export function groupDigits(value: number): string {
  const sign = value < 0 ? "-" : "";
  const digits = Math.abs(Math.trunc(value)).toString();
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Tiyinni so'mga aylantiradi va formatlaydi: 4500000 → "45 000 soʻm" */
export function formatPrice(money: Money, locale: AppLocale): string {
  const som = Math.round(money.amount / 100);
  return `${groupDigits(som)}${NBSP}${CURRENCY_LABEL[locale]}`;
}

/** Narx oralig'i: "50 000 – 80 000 soʻm". Chegaralar teng bo'lsa — bitta narx. */
export function formatPriceRange(min: Money, max: Money, locale: AppLocale): string {
  if (min.amount === max.amount) return formatPrice(min, locale);
  const from = groupDigits(Math.round(min.amount / 100));
  return `${from}${NBSP}–${NBSP}${formatPrice(max, locale)}`;
}
