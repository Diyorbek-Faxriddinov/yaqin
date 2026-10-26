/**
 * Brauzer xavfsizlik sarlavhalari (ADR-0013). next.config.ts barcha sahifalarga qo'shadi.
 *
 * CSP: tashqi manbalar aniq ro'yxat bilan — xarita plitkalari, Telegram Login Widget, Google
 * Identity Services. Skriptlarda 'unsafe-inline' qoldirilgan: Next.js inline skriptlarini nonce
 * bilan cheklash barcha sahifalarni har so'rovda serverda render qilishga majbur qiladi (statik
 * kesh yo'qoladi). Begona saytdan skript yuklash, maʼlumotni begona serverga yuborish va saytni
 * iframe'ga joylash baribir bloklanadi.
 */

const DEFAULT_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export type HeaderOptions = {
  /** `next dev`: React va HMR uchun 'unsafe-eval' va WebSocket */
  dev: boolean;
  /** NEXT_PUBLIC_MAP_STYLE_URL — xarita provayderi o'zgarsa, CSP ham o'zgaradi */
  mapStyleUrl?: string;
};

export function contentSecurityPolicy({ dev, mapStyleUrl }: HeaderOptions): string {
  const map = new URL(mapStyleUrl || DEFAULT_MAP_STYLE).origin;
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      ...(dev ? ["'unsafe-eval'"] : []),
      "https://telegram.org",
      "https://accounts.google.com/gsi/client",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://accounts.google.com/gsi/style"],
    // data: — admin QR kodi; blob: — rasm siqish va xarita
    "img-src": ["'self'", "data:", "blob:", map],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      map,
      "https://accounts.google.com/gsi/",
      ...(dev ? ["ws:", "wss:"] : []),
    ],
    // MapLibre web worker'i — o'z saytimizdan (/vendor) va blob
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["https://oauth.telegram.org", "https://accounts.google.com/gsi/"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "object-src": ["'none'"],
    "manifest-src": ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function securityHeaders(options: HeaderOptions): Array<{ key: string; value: string }> {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // Joylashuv — faqat o'z saytimiz ("Yaqin atrofimda"); kamera va mikrofon kerak emas
    // (rasm fayl tanlash orqali olinadi — bu ruxsat talab qilmaydi)
    {
      key: "Permissions-Policy",
      value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
    },
    // Google va Telegram kirish oynalari (popup) opener bilan aloqa qila olsin
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
}
