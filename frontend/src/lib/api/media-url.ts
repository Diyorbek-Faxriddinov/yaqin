/**
 * `next/image` optimizatori rasmni Next.js'ning o'zidan so'raydi (`/api/v1/media/...`) — u yerdan
 * rasm fayli qayerdan olinishi:
 * - `MEDIA_INTERNAL_URL` — productionda fayllarni beradigan ichki manzil (Caddy, deploy/Caddyfile);
 *   Django `DEBUG` o'chiq bo'lsa rasmlarni bermaydi;
 * - aks holda `API_URL/media` — ishlab chiqish va E2E (Django `DEBUG` rejimida beradi).
 *
 * Yo'l faqat fayl nomlari: `..`, bo'sh qism yoki to'liq URL bilan boshqa manzilga chiqib bo'lmaydi.
 */
export function mediaUpstreamUrl(
  path: string,
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (path.split("/").some((part) => part === ".." || part === "") || path.includes(":")) {
    return null;
  }
  const base = env.MEDIA_INTERNAL_URL || (env.API_URL ? `${env.API_URL}/media` : "");
  return base ? `${base.replace(/\/+$/, "")}/${path}` : null;
}
