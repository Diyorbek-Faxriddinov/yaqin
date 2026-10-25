/**
 * Sana: "12-oktabr, 2026" / "12 октября 2026 г." (Toshkent vaqti).
 * Intl ishlatiladi — faqat bitta muhitda render qilinadigan joylarda (server komponenti yoki
 * ma'lumot brauzerda yuklangandan keyin), hydration farqi bo'lmasligi uchun.
 */
export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Tashkent",
  }).format(new Date(iso));
}
