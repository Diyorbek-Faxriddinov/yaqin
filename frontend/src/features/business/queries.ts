import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import type { AppLocale } from "@/i18n/routing";
import { api, unwrap, unwrapOrNull } from "@/lib/api/server";
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

// Biznes profili: soatlab keshlanadi; admin o'zgartirganda `business:{slug}` tegi yangilanadi

export async function getBusiness(slug: string, locale: AppLocale) {
  "use cache";
  cacheLife("hours");
  cacheTag("businesses", `business:${slug}`);
  return unwrapOrNull(
    api.GET("/businesses/{slug}", { params: { path: { slug }, query: { lang: locale } } }),
  );
}

export async function getBusinessItems(slug: string, locale: AppLocale) {
  "use cache";
  cacheLife("hours");
  cacheTag(`business:${slug}`);
  return (
    (await unwrapOrNull(
      api.GET("/businesses/{slug}/items", { params: { path: { slug }, query: { lang: locale } } }),
    )) ?? []
  );
}

export async function getBusinessItem(slug: string, itemSlug: string, locale: AppLocale) {
  "use cache";
  cacheLife("hours");
  cacheTag(`business:${slug}`);
  return unwrapOrNull(
    api.GET("/businesses/{slug}/items/{itemSlug}", {
      params: { path: { slug, itemSlug }, query: { lang: locale } },
    }),
  );
}

export async function getBusinessReviews(slug: string, page = 1, pageSize = 5) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`business:${slug}`, `reviews:${slug}`);
  return unwrapOrNull(
    api.GET("/businesses/{slug}/reviews", {
      params: { path: { slug }, query: { page, pageSize } },
    }),
  );
}

/** Xarita nuqtalari — "hozir ochiq" vaqtga bog'liq, shuning uchun keshlanmaydi */
export async function getMapMarkers(
  filters: Pick<BusinessFilters, "category" | "district" | "openNow">,
  locale: AppLocale,
) {
  await connection();
  return unwrap(
    api.GET("/map/markers", {
      params: {
        query: {
          lang: locale,
          category: filters.category ?? undefined,
          district: filters.district ?? undefined,
          openNow: filters.openNow || undefined,
        },
      },
    }),
  );
}

/** Build vaqtida oldindan tayyorlanadigan biznes sahifalari ro'yxati */
export async function getAllBusinessSlugs() {
  "use cache";
  cacheLife("hours");
  cacheTag("businesses");
  const markers = await unwrap(api.GET("/map/markers", { params: { query: { lang: "uz" } } }));
  return markers.map((marker) => marker.slug);
}
