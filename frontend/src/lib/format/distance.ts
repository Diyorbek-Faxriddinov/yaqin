import type { AppLocale } from "@/i18n/routing";
import { formatDecimal } from "./number";

const NBSP = " ";

const UNITS: Record<AppLocale, { m: string; km: string }> = {
  uz: { m: "m", km: "km" },
  ru: { m: "м", km: "км" },
};

/**
 * Masofani formatlaydi: 0–999 m — 10 metrgacha yaxlitlangan metrda,
 * 1 km dan — bir kasr bilan, 10 km dan — butun kilometrda.
 */
export function formatDistance(meters: number, locale: AppLocale): string {
  const units = UNITS[locale];
  const rounded = Math.max(0, Math.round(meters / 10) * 10);

  if (rounded < 1000) return `${rounded}${NBSP}${units.m}`;

  const km = meters / 1000;
  const value = km < 10 ? formatDecimal(km, 1).replace(/,0$/, "") : String(Math.round(km));
  return `${value}${NBSP}${units.km}`;
}
