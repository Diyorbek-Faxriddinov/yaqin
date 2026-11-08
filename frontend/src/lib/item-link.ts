/**
 * Mahsulotning batafsil havolasi: faqat ruxsat etilgan platformalar, faqat https.
 * Backend `apps/businesses/links.py` bilan bir xil saqlang (roʻyxat — firibgarlikka qarshi).
 */

export type LinkPlatform = "instagram" | "telegram" | "youtube" | "tiktok" | "facebook";

export const MAX_ITEM_LINK = 500;

const HOSTS: Record<string, LinkPlatform> = {
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "m.instagram.com": "instagram",
  "t.me": "telegram",
  "telegram.me": "telegram",
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "tiktok.com": "tiktok",
  "www.tiktok.com": "tiktok",
  "m.tiktok.com": "tiktok",
  "vm.tiktok.com": "tiktok",
  "vt.tiktok.com": "tiktok",
  "facebook.com": "facebook",
  "www.facebook.com": "facebook",
  "m.facebook.com": "facebook",
  "web.facebook.com": "facebook",
  "fb.watch": "facebook",
};

/** Platforma yoki null (ruxsat etilmagan yoki notoʻgʻri havola) */
export function linkPlatform(url: string): LinkPlatform | null {
  // Boʻshliq va boshqaruv belgilari — backend ham rad etadi
  if (!url || url.length > MAX_ITEM_LINK || /[\s\u0000-\u001f]/.test(url)) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
  if (parsed.port && parsed.port !== "443") return null;
  return HOSTS[parsed.hostname.toLowerCase()] ?? null;
}
