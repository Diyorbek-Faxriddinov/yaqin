import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { AppLocale } from "@/i18n/routing";
import { api, unwrap, unwrapOrNull } from "@/lib/api/server";

// Kategoriyalar kam o'zgaradi — soatlab keshlanadi; admin o'zgartirganda "categories" tegi yangilanadi

export async function getCategoryTree(locale: AppLocale) {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return unwrap(api.GET("/categories", { params: { query: { lang: locale } } }));
}

export async function getCategory(slug: string, locale: AppLocale) {
  "use cache";
  cacheLife("hours");
  cacheTag("categories", `category:${slug}`);
  return unwrapOrNull(
    api.GET("/categories/{slug}", { params: { path: { slug }, query: { lang: locale } } }),
  );
}

export async function getDistricts(locale: AppLocale) {
  "use cache";
  cacheLife("days");
  cacheTag("districts");
  return unwrap(api.GET("/districts", { params: { query: { lang: locale } } }));
}
