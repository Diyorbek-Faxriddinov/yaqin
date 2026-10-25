export type GeoPoint = { lat: number; lng: number };

const EARTH_RADIUS_METERS = 6_371_000;

/** Ikki nuqta orasidagi masofa (haversine formulasi), metrda */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/**
 * Koordinatani ~110 metr aniqlikkacha yaxlitlaydi (3 kasr).
 * Foydalanuvchi joylashuvi serverga shu aniqlikdan ortiq yuborilmaydi — maxfiylik uchun.
 */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function isValidPoint(point: Partial<GeoPoint>): point is GeoPoint {
  return (
    typeof point.lat === "number" &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lat) &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 &&
    Math.abs(point.lng) <= 180
  );
}
