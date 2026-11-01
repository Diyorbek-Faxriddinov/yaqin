import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "./src/lib/security-headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Haqiqiy backend bilan E2E alohida build'da (demo build'ni buzmaslik uchun): NEXT_DIST_DIR=.next-backend
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Production Docker image (frontend/Dockerfile): faqat kerakli fayllar bilan mustaqil server.
  // Lokal ishlab chiqish va E2E `next start` bilan — odatiy build
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Faqat dev: start.ps1 -Tunnel (Cloudflare Tunnel) orqali ochilganda HMR va dev resurslari
  allowedDevOrigins: ["*.trycloudflare.com"],
  cacheComponents: true,
  // `use cache` — standart ishlovchi + xato bilan tugagan to'ldirishdan keyin osilib qolmaslik
  // tuzatishi (Next 16.4.3 xatosi; batafsil — cache-handler.mjs)
  cacheHandlers: { default: require.resolve("./cache-handler.mjs") },
  partialPrefetching: true,
  poweredByHeader: false,
  // Siqish — reverse proxy'da (Caddy `encode`, scripts/local/Caddyfile; productionda ham). Next'ning
  // o'z gzip'i oqimli javob xato bilan tugaganda oxirgi bo'lakni ba'zan yubormaydi — sahifa
  // "yuklanmoqda"da qolardi (backend javob bermasa, admin panel; e2e/resilience.spec.ts)
  compress: false,
  // Brauzer xavfsizlik sarlavhalari — barcha sahifalarga (ADR-0013)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          dev: process.env.NODE_ENV === "development",
          mapStyleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
        }),
      },
    ];
  },
  images: {
    // Faqat o'zimizning media yo'li va so'rov parametrlarisiz — optimallashtirgich boshqa
    // manzillar uchun suiiste'mol qilinmasligi uchun (CDN 5-bosqichda remotePatterns bilan)
    localPatterns: [{ pathname: "/api/v1/media/**", search: "" }],
  },
  experimental: {
    // [locale] ildiz segment bo'lgani uchun mos kelmagan URL'lar uchun yagona 404 sahifa
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
