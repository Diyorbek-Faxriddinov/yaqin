import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Haqiqiy backend bilan E2E alohida build'da (demo build'ni buzmaslik uchun): NEXT_DIST_DIR=.next-backend
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // Faqat dev: start.ps1 -Tunnel (Cloudflare Tunnel) orqali ochilganda HMR va dev resurslari
  allowedDevOrigins: ["*.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
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
