/**
 * Rasmni proporsiyani saqlagan holda `max` piksel ichiga sig'diradi (kattalashtirmaydi).
 * Telefon kamerasi 4000×3000 rasm beradi — yuklashdan oldin 1600 px gacha kichraytiriladi.
 */
export function fitWithin(
  width: number,
  height: number,
  max: number,
): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
