import type {
  BusinessDetail,
  BusinessPage,
  BusinessSort,
  BusinessSummary,
  CategoryDetail,
  CategoryNode,
  CategoryRef,
  District,
  Item,
  ItemPrice,
  MapMarker,
  Review,
  ReviewPage,
  SearchSuggestions,
} from "@/lib/api/types";
import { distanceMeters, type GeoPoint } from "@/lib/geo";
import { computeOpenStatus } from "@/lib/open-status";
import { matchesQuery, normalizeForSearch, searchStems } from "@/lib/text/normalize";
import {
  demoState,
  findCategory,
  itemsOf,
  photosOf,
  publicBusinesses,
  type DemoBusinessRecord,
  type DemoCategoryRecord,
} from "./demo-state";
import { BASE_DATE } from "./fixtures/businesses";
import type { DemoItem } from "./fixtures/items";
import { definitionsOf, publicAttributes } from "./item-attributes";
import { reviewsFor } from "./fixtures/reviews";
import { DISTRICTS } from "./fixtures/districts";

/**
 * Xotiradagi demo "maʼlumotlar bazasi". Backend (3-bosqich) xuddi shu natijalarni
 * PostgreSQL/PostGIS bilan qaytarishi kerak — bu fayl kontraktning xatti-harakatini ko'rsatadi.
 */

export type Lang = "uz" | "ru";

const districtBySlug = new Map(DISTRICTS.map((d) => [d.slug, d]));

export function categoryRef(category: DemoCategoryRecord, lang: Lang): CategoryRef {
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
  for (const category of demoState.categories) {
    if (category.parentSlug && result.has(category.parentSlug)) result.add(category.slug);
  }
  return result;
}

function countBusinesses(slug: string): number {
  const slugs = descendantSlugs(slug);
  return publicBusinesses().filter((b) => slugs.has(b.categorySlug)).length;
}

function categoryNode(category: DemoCategoryRecord, lang: Lang): CategoryNode {
  return {
    ...categoryRef(category, lang),
    businessCount: countBusinesses(category.slug),
    children: demoState.categories
      .filter((c) => c.parentSlug === category.slug)
      .map((c) => categoryNode(c, lang)),
  };
}

export function listCategories(lang: Lang): CategoryNode[] {
  return demoState.categories
    .filter((c) => c.parentSlug === null)
    .map((c) => categoryNode(c, lang));
}

export function getCategory(slug: string, lang: Lang): CategoryDetail | null {
  const category = findCategory(slug);
  if (!category) return null;
  const parent = category.parentSlug ? findCategory(category.parentSlug) : undefined;
  return {
    ...categoryNode(category, lang),
    parent: parent ? categoryRef(parent, lang) : null,
    attributes: category.attributes.map((attribute) => ({
      key: attribute.key,
      name: attribute.name[lang],
      type: attribute.type,
      unit: attribute.unit,
      options: attribute.options.map((o) => ({ value: o.value, label: o.label[lang] })),
      filterable: attribute.filterable,
    })),
  };
}

export function listDistricts(lang: Lang): District[] {
  return DISTRICTS.map((d) => ({ id: d.id, slug: d.slug, name: d.name[lang], center: d.center }));
}

const toMoney = (som: number) => ({ amount: som * 100, currency: "UZS" as const });

type PublicRecord = DemoBusinessRecord & { location: GeoPoint };

/** Admin qo'shgan bizneslarda narx oralig'i katalogdan hisoblanadi */
function priceRangeFromItems(items: Array<{ price: ItemPrice }>): BusinessSummary["priceRange"] {
  const amounts = items.flatMap((item) =>
    [item.price.min?.amount, item.price.max?.amount].filter((a): a is number => a != null),
  );
  if (amounts.length === 0) return null;
  return {
    min: { amount: Math.min(...amounts), currency: "UZS" },
    max: { amount: Math.max(...amounts), currency: "UZS" },
  };
}

function toSummary(business: PublicRecord, lang: Lang, origin: GeoPoint | null): BusinessSummary {
  const category = findCategory(business.categorySlug);
  const district = districtBySlug.get(business.districtSlug);
  if (!category || !district) throw new Error(`Demo maʼlumot buzilgan: ${business.slug}`);

  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    category: categoryRef(category, lang),
    district: { slug: district.slug, name: district.name[lang] },
    location: business.location,
    coverImage: photosOf(business.id)[0] ?? null,
    rating: ratingOf(business),
    priceRange: business.priceRange
      ? { min: toMoney(business.priceRange.min), max: toMoney(business.priceRange.max) }
      : priceRangeFromItems(itemsOf(business)),
    schedule: business.schedule,
    distanceMeters: origin ? Math.round(distanceMeters(origin, business.location)) : null,
    isVerified: business.isVerified,
    createdAt: business.createdAt,
    matchedItems: [],
  };
}

/** Mahsulot ommaviy ko'rinishda: kategoriya xususiyatlari so'ralgan tilda */
export function publicItem(item: DemoItem, business: DemoBusinessRecord, lang: Lang): Item {
  const { photos, attributes, ...rest } = item;
  const known = definitionsOf(findCategory(business.categorySlug)?.attributes ?? []);
  return {
    ...rest,
    attributes: publicAttributes(attributes, known, lang),
    images: photos.map(({ url, width, height, alt }) => ({ url, width, height, alt })),
  };
}

// Qisqa so'zlar ("a", "va") deyarli har bir mahsulot nomida bor — "nima uchun topildi" uchun emas
const MIN_MATCH_TOKEN = 3;
const MAX_MATCHED_ITEMS = 3;

/** `matchedItems`: nomida qidiruv so'zlaridan biri bor mahsulotlar (backend bilan bir xil) */
function matchedItems(business: DemoBusinessRecord, q: string): BusinessSummary["matchedItems"] {
  const stems = searchStems(q).filter((stem) => stem.length >= MIN_MATCH_TOKEN);
  if (stems.length === 0) return [];
  return itemsOf(business)
    .filter((item) => {
      const name = normalizeForSearch(item.name);
      return stems.some((stem) => name.includes(stem));
    })
    .slice(0, MAX_MATCHED_ITEMS)
    .map(({ slug, name }) => ({ slug, name }));
}

/** Ommaviy ism: "Malika Rahimova" → "Malika R." (to'liq ism ko'rsatilmaydi) */
export function publicAuthorName(displayName: string): string {
  const [first = "", second] = displayName.trim().split(/\s+/);
  return second ? `${first} ${second.charAt(0).toUpperCase()}.` : first;
}

/** Moderatsiyadan o'tgan foydalanuvchi sharhlari (eng yangisi birinchi) */
function userReviews(businessId: string): Review[] {
  return demoState.reviews
    .filter((r) => r.businessId === businessId && r.status === "published")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => ({
      id: r.id,
      // Akkaunt o'chirilgan bo'lsa — muallif nomi ko'rsatilmaydi (DELETE /me)
      authorName: demoState.users.get(r.userId)
        ? publicAuthorName(demoState.users.get(r.userId)?.displayName ?? "")
        : "Oʻchirilgan foydalanuvchi",
      rating: r.rating,
      text: r.text,
      createdAt: r.createdAt,
      reply: null,
    }));
}

/** Reyting: demo boshlang'ich qiymat + chop etilgan foydalanuvchi sharhlari */
function ratingOf(business: DemoBusinessRecord): BusinessSummary["rating"] {
  const extra = demoState.reviews.filter(
    (r) => r.businessId === business.id && r.status === "published",
  );
  if (extra.length === 0) return business.rating;
  const count = business.rating.count + extra.length;
  const sum =
    (business.rating.average ?? 0) * business.rating.count +
    extra.reduce((total, r) => total + r.rating, 0);
  return { average: Math.round((sum / count) * 10) / 10, count };
}

/** Qidiruv matni: nom, kategoriya (ikkala tilda, ota-kategoriya bilan), tuman, katalog */
function searchText(business: DemoBusinessRecord): string {
  const category = findCategory(business.categorySlug);
  const parent = category?.parentSlug ? findCategory(category.parentSlug) : undefined;
  const district = districtBySlug.get(business.districtSlug);
  return [
    business.name,
    category?.name.uz,
    category?.name.ru,
    parent?.name.uz,
    parent?.name.ru,
    district?.name.uz,
    district?.name.ru,
    ...itemsOf(business).flatMap((item) => [item.name, item.group]),
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

  const matching = publicBusinesses().filter((b) => {
    if (categorySlugs && !categorySlugs.has(b.categorySlug)) return false;
    if (district && b.districtSlug !== district) return false;
    if (q && !matchesQuery(searchText(b), q)) return false;
    if (openNow) {
      const state = computeOpenStatus(b.schedule, now).state;
      if (state !== "open" && state !== "closingSoon") return false;
    }
    return true;
  });
  const records = new Map(matching.map((b) => [b.id, b]));
  let items = matching.map((b) => toSummary(b, lang, origin));

  const compare: Record<BusinessSort, (a: BusinessSummary, b: BusinessSummary) => number> = {
    recommended: (a, b) => recommendedScore(b) - recommendedScore(a),
    rating: (a, b) =>
      (b.rating.average ?? 0) - (a.rating.average ?? 0) || b.rating.count - a.rating.count,
    distance: (a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0),
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  };
  items = items.sort(compare[sort]);

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize).map((summary) => {
    const record = records.get(summary.id);
    return q && record ? { ...summary, matchedItems: matchedItems(record, q) } : summary;
  });
  return { items: pageItems, total: items.length, page, pageSize };
}

export function getBusiness(slug: string, lang: Lang): BusinessDetail | null {
  const business = findBusiness(slug);
  if (!business) return null;
  return {
    ...toSummary(business, lang, null),
    description: business.description,
    address: business.address,
    phones: business.phones,
    telegram: business.telegram,
    instagram: business.instagram,
    website: null,
    gallery: photosOf(business.id),
  };
}

export function suggest(q: string, lang: Lang): SearchSuggestions {
  const normalized = normalizeForSearch(q);
  const stems = searchStems(q);
  return {
    categories: demoState.categories
      .filter(
        (c) =>
          normalizeForSearch(c.name.uz).includes(normalized) ||
          normalizeForSearch(c.name.ru).includes(normalized),
      )
      .slice(0, 5)
      .map((c) => categoryRef(c, lang)),
    businesses: publicBusinesses()
      .filter((b) => matchesQuery(b.name, q))
      .slice(0, 5)
      .map((b) => ({
        slug: b.slug,
        name: b.name,
        categoryName: findCategory(b.categorySlug)?.name[lang] ?? "",
      })),
    // Nomida barcha so'zlar bor mahsulotlar (backend: nom bo'yicha tartiblangan, 5 tagacha)
    items: publicBusinesses()
      .flatMap((b) =>
        itemsOf(b)
          .filter((item) => {
            const name = normalizeForSearch(item.name);
            return stems.length > 0 && stems.every((stem) => name.includes(stem));
          })
          .map((item) => ({
            slug: item.slug,
            name: item.name,
            businessSlug: b.slug,
            businessName: b.name,
          })),
      )
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      .slice(0, 5),
  };
}

/** Faqat ommaviy (e'lon qilingan) bizneslar orasidan */
function findBusiness(slug: string): PublicRecord | undefined {
  return publicBusinesses().find((b) => b.slug === slug);
}

export function listItems(slug: string, lang: Lang): Item[] | null {
  const business = findBusiness(slug);
  // Ommaviy saytda faqat mavjud mahsulotlar emas, hammasi (holati bilan) ko'rsatiladi
  return business ? itemsOf(business).map((item) => publicItem(item, business, lang)) : null;
}

export function getItem(slug: string, itemSlug: string, lang: Lang): Item | null {
  return listItems(slug, lang)?.find((item) => item.slug === itemSlug) ?? null;
}

export function listReviews(slug: string, page = 1, pageSize = 20): ReviewPage | null {
  const business = findBusiness(slug);
  if (!business) return null;
  const all = [...userReviews(business.id), ...reviewsFor(business, BASE_DATE)];
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), total: all.length, page, pageSize };
}

export type ListMarkersParams = {
  lang: Lang;
  category?: string;
  district?: string;
  openNow?: boolean;
  now?: Date;
};

export function listMarkers(params: ListMarkersParams): MapMarker[] {
  // Ro'yxat bilan bir xil filtrlar; xarita uchun sahifalashsiz
  const page = listBusinesses({ ...params, pageSize: 1000 });
  return page.items.map(({ id, slug, name, location, category, rating, schedule }) => ({
    id,
    slug,
    name,
    location,
    category,
    rating,
    schedule,
  }));
}
