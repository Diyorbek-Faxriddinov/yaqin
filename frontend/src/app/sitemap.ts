import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { routing } from "@/i18n/routing";
import { api, unwrap } from "@/lib/api/server";
import { absoluteUrl, languageAlternates } from "@/lib/seo";

const STATIC_PATHS = ["/", "/kategoriyalar", "/xarita", "/haqida", "/aloqa", "/biznes-qoshish"];

type Page = { path: string; lastModified?: string; priority: number };

/** E'lon qilingan barcha bizneslar (API sahifalab beradi — har sahifada 50 tadan) */
async function allBusinesses() {
  const first = await unwrap(api.GET("/businesses", { params: { query: { pageSize: 50 } } }));
  const pages = Math.ceil(first.total / first.pageSize);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      unwrap(api.GET("/businesses", { params: { query: { pageSize: 50, page: i + 2 } } })),
    ),
  );
  return [first, ...rest].flatMap((page) => page.items);
}

/**
 * Sitemap: statik sahifalar, kategoriyalar, bizneslar, ularning sharhlari va mahsulotlari —
 * har biri ikkala tilda (hreflang bilan). Soatlab keshlanadi; admin o'zgartirsa teglar yangilanadi.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheLife("hours");
  cacheTag("businesses", "categories");

  const [tree, businesses] = await Promise.all([
    unwrap(api.GET("/categories", { params: { query: { lang: "uz" } } })),
    allBusinesses(),
  ]);
  const items = await Promise.all(
    businesses.map((business) =>
      unwrap(api.GET("/businesses/{slug}/items", { params: { path: { slug: business.slug } } })),
    ),
  );

  const pages: Page[] = [
    ...STATIC_PATHS.map((path) => ({ path, priority: path === "/" ? 1 : 0.6 })),
    ...tree
      .flatMap((root) => [root, ...root.children])
      .map((category) => ({
        path: `/kategoriya/${category.slug}`,
        priority: 0.7,
      })),
    ...businesses.flatMap((business, index) => [
      { path: `/biznes/${business.slug}`, lastModified: business.createdAt, priority: 0.8 },
      ...(business.rating.count > 0
        ? [{ path: `/biznes/${business.slug}/sharhlar`, priority: 0.4 }]
        : []),
      ...(items[index] ?? []).map((item) => ({
        path: `/biznes/${business.slug}/${item.slug}`,
        priority: 0.5,
      })),
    ]),
  ];

  return pages.flatMap(({ path, lastModified, priority }) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(path, locale),
      lastModified,
      priority,
      alternates: { languages: languageAlternates(path) },
    })),
  );
}
