import { isValidPoint, roundCoordinate, type GeoPoint } from "./geo";

/**
 * Foydalanuvchi joylashuvi cookie'da (~110 m aniqlikda) — server komponentlari masofani
 * hisoblashi uchun. URL'ga yozilmaydi (havola ulashilganda joylashuv oshkor bo'lmasin).
 * Server uni faqat API so'roviga uzatadi, saqlamaydi (ADR-0005).
 */
export const LOCATION_COOKIE = "yaqin_loc";
export const LOCATION_MAX_AGE_SECONDS = 60 * 60 * 24;

export function serializeLocation(point: GeoPoint): string {
  return `${roundCoordinate(point.lat)},${roundCoordinate(point.lng)}`;
}

export function parseLocation(value: string | undefined | null): GeoPoint | null {
  if (!value) return null;
  const parts = value.split(",");
  if (parts.length !== 2) return null;
  const point = { lat: Number(parts[0]), lng: Number(parts[1]) };
  return isValidPoint(point)
    ? { lat: roundCoordinate(point.lat), lng: roundCoordinate(point.lng) }
    : null;
}
