import type { BusinessSort } from "@/lib/api/types";

/**
 * Ro'yxat sahifalari URL parametrlari (o'zbekcha, odamga tushunarli):
 *   ?q=sartarosh&tuman=chilonzor&ochiq=1&saralash=yaqin&sahifa=2&kategoriya=gozallik
 * Bu modul URL ↔ filtrlar ↔ API parametrlari o'rtasidagi yagona tarjimon.
 */

export const SORT_PARAM = {
  recommended: "tavsiya",
  rating: "reyting",
  distance: "yaqin",
  newest: "yangi",
} as const satisfies Record<BusinessSort, string>;

export const SORT_ORDER: BusinessSort[] = ["recommended", "rating", "distance", "newest"];

export type BusinessFilters = {
  q: string;
  district: string | null;
  category: string | null;
  openNow: boolean;
  sort: BusinessSort;
  page: number;
};

export const DEFAULT_FILTERS: BusinessFilters = {
  q: "",
  district: null,
  category: null,
  openNow: false,
  sort: "recommended",
  page: 1,
};

export const PAGE_SIZE = 12;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const SLUG = /^[a-z0-9-]{1,120}$/;

export function parseFilters(params: RawParams): BusinessFilters {
  const sortParam = first(params.saralash);
  const sort =
    (Object.entries(SORT_PARAM).find(([, value]) => value === sortParam)?.[0] as BusinessSort) ??
    "recommended";
  const page = Number.parseInt(first(params.sahifa) ?? "1", 10);
  const district = first(params.tuman);
  const category = first(params.kategoriya);

  return {
    q: (first(params.q) ?? "").trim().slice(0, 100),
    district: district && SLUG.test(district) ? district : null,
    category: category && SLUG.test(category) ? category : null,
    openNow: first(params.ochiq) === "1",
    sort,
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

/** Filtrlarni URL so'roviga aylantiradi; standart qiymatlar yozilmaydi (toza URL) */
export function filtersToQuery(filters: Partial<BusinessFilters>): string {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.category) query.set("kategoriya", filters.category);
  if (filters.district) query.set("tuman", filters.district);
  if (filters.openNow) query.set("ochiq", "1");
  if (filters.sort && filters.sort !== "recommended")
    query.set("saralash", SORT_PARAM[filters.sort]);
  if (filters.page && filters.page > 1) query.set("sahifa", String(filters.page));
  const result = query.toString();
  return result ? `?${result}` : "";
}

/** Filtr o'zgarganda sahifa birinchiga qaytadi */
export function withFilter(current: BusinessFilters, patch: Partial<BusinessFilters>): string {
  return filtersToQuery({ ...current, page: 1, ...patch });
}
