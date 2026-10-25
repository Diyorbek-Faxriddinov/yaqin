import type {
  BusinessDetail,
  BusinessPage,
  BusinessSort,
  BusinessSummary,
  CategoryDetail,
  CategoryNode,
  CategoryRef,
  District,
  SearchSuggestions,
} from "@/lib/api/types";
import { distanceMeters, type GeoPoint } from "@/lib/geo";
import { computeOpenStatus } from "@/lib/open-status";
import { matchesQuery, normalizeForSearch } from "@/lib/text/normalize";
import { BUSINESSES, type DemoBusiness } from "./fixtures/businesses";
import { CATEGORIES, type DemoCategory } from "./fixtures/categories";
import { DISTRICTS } from "./fixtures/districts";

/**
 * Xotiradagi demo "maʼlumotlar bazasi". Backend (3-bosqich) xuddi shu natijalarni
 * PostgreSQL/PostGIS bilan qaytarishi kerak — bu fayl kontraktning xatti-harakatini ko'rsatadi.
 */

export type Lang = "uz" | "ru";

const categoryBySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
const districtBySlug = new Map(DISTRICTS.map((d) => [d.slug, d]));

function categoryRef(category: DemoCategory, lang: Lang): CategoryRef {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name[lang],
    iconKey: category.iconKey,
  };
}

/** Kategoriya va uning barcha ichki kategoriyalari slug'lari */
function descendantSlugs(slug: string): Set<string> {
  const result = new Set([slug]);
  for (const category of CATEGORIES) {
    if (category.parentSlug && result.has(category.parentSlug)) result.add(category.slug);
  }
  return result;
}

function countBusinesses(slug: string): number {
  const slugs = descendantSlugs(slug);
  return BUSINESSES.filter((b) => slugs.has(b.categorySlug)).length;
}

function categoryNode(category: DemoCategory, lang: Lang): CategoryNode {
  return {
    ...categoryRef(category, lang),
    businessCount: countBusinesses(category.slug),
    children: CATEGORIES.filter((c) => c.parentSlug === category.slug).map((c) =>
      categoryNode(c, lang),
    ),
  };
}

export function listCategories(lang: Lang): CategoryNode[] {
  return CATEGORIES.filter((c) => c.parentSlug === null).map((c) => categoryNode(c, lang));
}

export function getCategory(slug: string, lang: Lang): CategoryDetail | null {
  const category = categoryBySlug.get(slug);
  if (!category) return null;
  const parent = category.parentSlug ? categoryBySlug.get(category.parentSlug) : undefined;
  return {
    ...categoryNode(category, lang),
    parent: parent ? categoryRef(parent, lang) : null,
    attributes: [],
  };
}

export function listDistricts(lang: Lang): District[] {
  return DISTRICTS.map((d) => ({ id: d.id, slug: d.slug, name: d.name[lang], center: d.center }));
}

const toMoney = (som: number) => ({ amount: som * 100, currency: "UZS" as const });

function toSummary(business: DemoBusiness, lang: Lang, origin: GeoPoint | null): BusinessSummary {
  const category = categoryBySlug.get(business.categorySlug);
  const district = districtBySlug.get(business.districtSlug);
  if (!category || !district) throw new Error(`Demo maʼlumot buzilgan: ${business.slug}`);

  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    category: categoryRef(category, lang),
    district: { slug: district.slug, name: district.name[lang] },
    location: business.location,
    coverImage: null,
    rating: business.rating,
    priceRange: business.priceRange
      ? { min: toMoney(business.priceRange.min), max: toMoney(business.priceRange.max) }
      : null,
    schedule: business.schedule,
    distanceMeters: origin ? Math.round(distanceMeters(origin, business.location)) : null,
    isVerified: business.isVerified,
    createdAt: business.createdAt,
  };
}

/** Qidiruv matni: nom, kategoriya (ikkala tilda, ota-kategoriya bilan), tuman */
function searchText(business: DemoBusiness): string {
  const category = categoryBySlug.get(business.categorySlug);
  const parent = category?.parentSlug ? categoryBySlug.get(category.parentSlug) : undefined;
  const district = districtBySlug.get(business.districtSlug);
  return [
    business.name,
    category?.name.uz,
    category?.name.ru,
    parent?.name.uz,
    parent?.name.ru,
    district?.name.uz,
    district?.name.ru,
  ]
    .filter(Boolean)
    .join(" ");
}

/** "Tavsiya etilgan": reyting × ishonch (sharhlar soni) + tekshirilganlik */
function recommendedScore(summary: BusinessSummary): number {
  const average = summary.rating.average ?? 3;
  return average * Math.log10(summary.rating.count + 10) + (summary.isVerified ? 0.5 : 0);
}

export type ListBusinessesParams = {
  lang: Lang;
  q?: string;
  category?: string;
  district?: string;
  openNow?: boolean;
  origin?: GeoPoint | null;
  sort?: BusinessSort;
  page?: number;
  pageSize?: number;
  now?: Date;
};

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly fields: Record<string, string[]>,
  ) {
    super(message);
  }
}

export function listBusinesses(params: ListBusinessesParams): BusinessPage {
  const {
    lang,
    q,
    category,
    district,
    openNow,
    origin = null,
    sort = "recommended",
    page = 1,
    pageSize = 20,
    now = new Date(),
  } = params;

  if (sort === "distance" && !origin) {
    throw new ValidationError("sort=distance uchun lat va lng kerak", {
      sort: ["Masofa boʻyicha saralash uchun joylashuv kerak"],
    });
  }

  const categorySlugs = category ? descendantSlugs(category) : null;

  let items = BUSINESSES.filter((b) => {
    if (categorySlugs && !categorySlugs.has(b.categorySlug)) return false;
    if (district && b.districtSlug !== district) return false;
    if (q && !matchesQuery(searchText(b), q)) return false;
    if (openNow) {
      const state = computeOpenStatus(b.schedule, now).state;
      if (state !== "open" && state !== "closingSoon") return false;
    }
    return true;
  }).map((b) => toSummary(b, lang, origin));

  const compare: Record<BusinessSort, (a: BusinessSummary, b: BusinessSummary) => number> = {
    recommended: (a, b) => recommendedScore(b) - recommendedScore(a),
    rating: (a, b) =>
      (b.rating.average ?? 0) - (a.rating.average ?? 0) || b.rating.count - a.rating.count,
    distance: (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  items = items.sort(compare[sort]);

  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

export function getBusiness(slug: string, lang: Lang): BusinessDetail | null {
  const business = BUSINESSES.find((b) => b.slug === slug);
  if (!business) return null;
  return {
    ...toSummary(business, lang, null),
    description: business.description,
    address: business.address,
    phones: business.phones,
    telegram: null,
    instagram: null,
    website: null,
    gallery: [],
  };
}

export function suggest(q: string, lang: Lang): SearchSuggestions {
  const normalized = normalizeForSearch(q);
  return {
    categories: CATEGORIES.filter(
      (c) =>
        normalizeForSearch(c.name.uz).includes(normalized) ||
        normalizeForSearch(c.name.ru).includes(normalized),
    )
      .slice(0, 5)
      .map((c) => categoryRef(c, lang)),
    businesses: BUSINESSES.filter((b) => matchesQuery(b.name, q))
      .slice(0, 5)
      .map((b) => ({
        slug: b.slug,
        name: b.name,
        categoryName: categoryBySlug.get(b.categorySlug)?.name[lang] ?? "",
      })),
  };
}
