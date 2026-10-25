/**
 * Kirishdan keyin qaytish manzili (?next=). Faqat o'z saytimiz ichidagi nisbiy yo'l qabul
 * qilinadi — "open redirect" hujumining oldini olish uchun (//evil.com, https://..., /\evil).
 */
export function safeNextPath(value: string | null | undefined, fallback = "/profil"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001F]/.test(value)) return fallback;
  try {
    // Nisbiy yo'l bo'lib qolishini tekshiramiz: boshqa host'ga aylanmasin
    const url = new URL(value, "http://yaqin.local");
    if (url.host !== "yaqin.local") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
