import type { GeoPoint } from "./geo";

/**
 * Tashqi xaritalarda yo'l ko'rsatish havolalari. Pullik API kerak emas: foydalanuvchi
 * o'zi tanlagan ilovada (telefonda o'rnatilgan bo'lsa — ilovada) ochiladi.
 * Boshlang'ich nuqta — foydalanuvchining joriy joylashuvi (xarita ilovasi o'zi aniqlaydi).
 */
export function yandexDirectionsUrl({ lat, lng }: GeoPoint): string {
  return `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
}

export function googleDirectionsUrl({ lat, lng }: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
