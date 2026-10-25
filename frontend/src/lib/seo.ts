import type { Metadata } from "next";
import { localizedPath } from "@/i18n/localized-path";
import { routing, type AppLocale } from "@/i18n/routing";

/** Saytning ommaviy manzili (canonical, sitemap, OG) — oxirida "/" siz */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Tilsiz yo'l → to'liq manzil: "/kategoriyalar", "ru" → "https://.../ru/kategoriyalar" */
export function absoluteUrl(path: string, locale: AppLocale): string {
  return `${siteUrl()}${localizedPath(path, locale)}`;
}

/** hreflang: har bir til + x-default (asosiy til) */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(routing.locales.map((locale) => [locale, absoluteUrl(path, locale)])),
    "x-default": absoluteUrl(path, routing.defaultLocale),
  };
}

const OG_LOCALE: Record<AppLocale, string> = { uz: "uz_UZ", ru: "ru_RU" };

/** Standart ulashish rasmi — app/[locale]/opengraph-image.tsx (sahifa o'z openGraph'ini berganda meros qilinmaydi) */
export function defaultOgImage(locale: AppLocale) {
  return { url: localizedPath("/opengraph-image", locale), width: 1200, height: 630, alt: "Yaqin" };
}

/**
 * Indekslanadigan sahifa metadatasi: canonical, hreflang va Open Graph.
 * Next.js metadata'ni sayoz birlashtiradi — openGraph har sahifada to'liq beriladi.
 */
export function pageMetadata({
  path,
  locale,
  title,
  description,
  image,
}: {
  /** Tilsiz yo'l, masalan "/biznes/ustoz-sartaroshxonasi" */
  path: string;
  locale: AppLocale;
  title?: string;
  description?: string;
  image?: { url: string; width: number; height: number; alt?: string | null };
}): Metadata {
  const url = absoluteUrl(path, locale);
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: "Yaqin",
      url,
      locale: OG_LOCALE[locale],
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => OG_LOCALE[l]),
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      images: [image ? { ...image, alt: image.alt ?? title } : defaultOgImage(locale)],
    },
  };
}
