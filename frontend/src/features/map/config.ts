/**
 * Xarita sozlamalari. Standart — OpenFreeMap (OpenStreetMap asosidagi bepul vektor tile'lar,
 * API kalit kerak emas). Boshqa provayderga o'tish uchun NEXT_PUBLIC_MAP_STYLE_URL (ADR-0003).
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

export const TASHKENT_CENTER = { lat: 41.3111, lng: 69.2797 };

export type MapPoint = { slug: string; name: string; lat: number; lng: number };
