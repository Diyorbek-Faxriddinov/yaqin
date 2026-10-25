import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { AppLocale } from "@/i18n/routing";
import { api, unwrap } from "@/lib/api/server";
import type { GeoPoint } from "@/lib/geo";
import { PAGE_SIZE, type BusinessFilters } from "./search-params";

/**
 * Filtrlangan ro'yxat. Keshlanmaydi: natija joylashuv va "hozir ochiq" (vaqt) ga bog'liq.
 * Masofa bo'yicha saralash joylashuvsiz so'ralmaydi — "tavsiya etilgan" ga qaytadi.
 */
export async function searchBusinesses(
  filters: BusinessFilters,
  locale: AppLocale,
  origin: GeoPoint | null,
) {
  // Har bir so'rovda yangidan hisoblanadi ("hozir ochiq" — joriy vaqtga bog'liq):
  // prerender shu yerda to'xtaydi (cacheComponents)
  await connection();
  const sort = filters.sort === "distance" && !origin ? "recommended" : filters.sort;
  return unwrap(
    api.GET("/businesses", {
      params: {
        query: {
          lang: locale,
          q: filters.q || undefined,
          category: filters.category ?? undefined,
          district: filters.district ?? undefined,
          openNow: filters.openNow || undefined,
          lat: origin?.lat,
          lng: origin?.lng,
          sort,
          page: filters.page,
          pageSize: PAGE_SIZE,
        },
      },
    }),
  );
}

/** Bosh sahifadagi "Yangi qo'shilganlar" */
export async function getNewestBusinesses(locale: AppLocale, limit = 8) {
  "use cache";
  cacheLife("hours");
  cacheTag("businesses");
  const page = await unwrap(
    api.GET("/businesses", {
      params: { query: { lang: locale, sort: "newest", pageSize: limit } },
    }),
  );
  return page.items;
}
