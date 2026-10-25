import type { AppLocale } from "@/i18n/routing";

const NBSP = " ";

const UNITS: Record<AppLocale, { h: string; m: string }> = {
  uz: { h: "soat", m: "daq" },
  ru: { h: "ч", m: "мин" },
};

/** Xizmat davomiyligi: 30 → "30 daq", 90 → "1 soat 30 daq", 120 → "2 soat" */
export function formatDuration(minutes: number, locale: AppLocale): string {
  const { h, m } = UNITS[locale];
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}${NBSP}${h}`);
  if (rest > 0 || hours === 0) parts.push(`${rest}${NBSP}${m}`);
  return parts.join(" ");
}
