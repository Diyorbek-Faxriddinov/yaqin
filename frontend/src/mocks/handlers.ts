import { http, HttpResponse } from "msw";
import type { ApiError, BusinessSort } from "@/lib/api/types";
import { isValidPoint } from "@/lib/geo";
import {
  getBusiness,
  getCategory,
  getItem,
  listBusinesses,
  listCategories,
  listDistricts,
  listItems,
  listMarkers,
  listReviews,
  suggest,
  ValidationError,
  type Lang,
} from "./db";
import { adminCategoryHandlers } from "./admin-category-handlers";
import { adminHandlers } from "./admin-handlers";
import { adminModerationHandlers } from "./admin-moderation-handlers";
import { adminSystemHandlers } from "./admin-system-handlers";
import { meHandlers } from "./me-handlers";

// Handler'lar har qanday host'dagi /api/v1 yo'lini ushlaydi (API_URL qanday bo'lishidan qat'i nazar)
const API = "*/api/v1";

const SORTS: BusinessSort[] = ["recommended", "rating", "distance", "newest"];

const MESSAGES = {
  notFound: { uz: "Topilmadi", ru: "Не найдено" },
  invalid: { uz: "Soʻrov parametrlari notoʻgʻri", ru: "Неверные параметры запроса" },
} as const;

function langOf(url: URL): Lang {
  return url.searchParams.get("lang") === "ru" ? "ru" : "uz";
}

function error(status: number, body: ApiError) {
  return HttpResponse.json(body, { status });
}

function notFound(lang: Lang) {
  return error(404, { code: "not_found", message: MESSAGES.notFound[lang] });
}

function optionalNumber(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export const handlers = [
  ...meHandlers,
  ...adminHandlers,
  ...adminCategoryHandlers,
  ...adminModerationHandlers,
  ...adminSystemHandlers,
  http.get(`${API}/categories`, ({ request }) => {
    return HttpResponse.json(listCategories(langOf(new URL(request.url))));
  }),

  http.get(`${API}/categories/:slug`, ({ request, params }) => {
    const lang = langOf(new URL(request.url));
    const category = getCategory(String(params.slug), lang);
    return category ? HttpResponse.json(category) : notFound(lang);
  }),

  http.get(`${API}/districts`, ({ request }) => {
    return HttpResponse.json(listDistricts(langOf(new URL(request.url))));
  }),

  http.get(`${API}/businesses`, ({ request }) => {
    const url = new URL(request.url);
    const lang = langOf(url);
    const query = url.searchParams;

    const lat = optionalNumber(query.get("lat"));
    const lng = optionalNumber(query.get("lng"));
    const page = optionalNumber(query.get("page")) ?? 1;
    const pageSize = optionalNumber(query.get("pageSize")) ?? 20;
    const sort = (query.get("sort") ?? "recommended") as BusinessSort;

    const fields: Record<string, string[]> = {};
    if (
      (lat === undefined) !== (lng === undefined) ||
      (lat !== undefined && !isValidPoint({ lat, lng }))
    ) {
      fields.lat = ["lat va lng birga va toʻgʻri koordinata boʻlishi kerak"];
    }
    if (!Number.isInteger(page) || page < 1) fields.page = ["page ≥ 1 butun son"];
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) {
      fields.pageSize = ["pageSize 1–50 oraligʻida"];
    }
    if (!SORTS.includes(sort)) fields.sort = [`sort: ${SORTS.join(", ")}`];
    if (Object.keys(fields).length > 0) {
      return error(400, { code: "validation_error", message: MESSAGES.invalid[lang], fields });
    }

    try {
      return HttpResponse.json(
        listBusinesses({
          lang,
          q: query.get("q")?.slice(0, 100) || undefined,
          category: query.get("category") || undefined,
          district: query.get("district") || undefined,
          openNow: query.get("openNow") === "true",
          origin: lat !== undefined && lng !== undefined ? { lat, lng } : null,
          sort,
          page,
          pageSize,
        }),
      );
    } catch (err) {
      if (err instanceof ValidationError) {
        return error(400, {
          code: "validation_error",
          message: MESSAGES.invalid[lang],
          fields: err.fields,
        });
      }
      throw err;
    }
  }),

  http.get(`${API}/businesses/:slug`, ({ request, params }) => {
    const lang = langOf(new URL(request.url));
    const business = getBusiness(String(params.slug), lang);
    return business ? HttpResponse.json(business) : notFound(lang);
  }),

  http.get(`${API}/businesses/:slug/items`, ({ request, params }) => {
    const lang = langOf(new URL(request.url));
    const items = listItems(String(params.slug), lang);
    return items ? HttpResponse.json(items) : notFound(lang);
  }),

  http.get(`${API}/businesses/:slug/items/:itemSlug`, ({ request, params }) => {
    const lang = langOf(new URL(request.url));
    const item = getItem(String(params.slug), String(params.itemSlug), lang);
    return item ? HttpResponse.json(item) : notFound(lang);
  }),

  http.get(`${API}/businesses/:slug/reviews`, ({ request, params }) => {
    const url = new URL(request.url);
    const lang = langOf(url);
    const page = optionalNumber(url.searchParams.get("page")) ?? 1;
    const pageSize = optionalNumber(url.searchParams.get("pageSize")) ?? 20;
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 50
    ) {
      return error(400, { code: "validation_error", message: MESSAGES.invalid[lang] });
    }
    const reviews = listReviews(String(params.slug), page, pageSize);
    return reviews ? HttpResponse.json(reviews) : notFound(lang);
  }),

  http.get(`${API}/map/markers`, ({ request }) => {
    const url = new URL(request.url);
    return HttpResponse.json(
      listMarkers({
        lang: langOf(url),
        category: url.searchParams.get("category") || undefined,
        district: url.searchParams.get("district") || undefined,
        openNow: url.searchParams.get("openNow") === "true",
      }),
    );
  }),

  http.get(`${API}/search/suggest`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const lang = langOf(url);
    if (q.trim().length < 2) {
      return error(400, {
        code: "validation_error",
        message: MESSAGES.invalid[lang],
        fields: { q: ["Kamida 2 ta belgi"] },
      });
    }
    return HttpResponse.json(suggest(q, lang));
  }),

  // Demo rejimida statistika hech qayerga yozilmaydi
];
