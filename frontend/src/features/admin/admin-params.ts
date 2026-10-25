import type { BusinessStatus } from "@/lib/api/types";

/**
 * Admin sahifalari URL parametrlari. "use client" fayllaridan alohida — server sahifalari ham
 * ishlatadi (client modulidagi funksiyani serverda chaqirib bo'lmaydi).
 */

export type ListFilter = "all" | BusinessStatus | "noConsent";

/** ?filtr= (o'zbekcha) → ro'yxat filtri */
export function parseListFilter(value: string | undefined): ListFilter {
  if (value === "rozilik") return "noConsent";
  return value === "draft" || value === "published" || value === "hidden" ? value : "all";
}

export const BUSINESS_SECTIONS = [
  "basic",
  "location",
  "photos",
  "hours",
  "contacts",
  "catalog",
  "status",
] as const;
export type BusinessSection = (typeof BUSINESS_SECTIONS)[number];

/** ?bolim= → tahrirlash sahifasidagi tab */
export function parseTab(value: string | undefined): BusinessSection {
  return (BUSINESS_SECTIONS as readonly string[]).includes(value ?? "")
    ? (value as BusinessSection)
    : "basic";
}

/** ?filtr= qiymati ruxsat etilganlar orasida bo'lsa — o'zi, aks holda standart (navbat) */
function pick<T extends string>(allowed: readonly T[], value: string | undefined, fallback: T): T {
  return (allowed as readonly string[]).includes(value ?? "") ? (value as T) : fallback;
}

export const REVIEW_FILTERS = ["pending", "published", "rejected"] as const;
export type ReviewFilter = (typeof REVIEW_FILTERS)[number];
export const parseReviewFilter = (value: string | undefined) =>
  pick(REVIEW_FILTERS, value, "pending");

export const COMPLAINT_FILTERS = ["open", "in_review", "resolved", "rejected"] as const;
export type ComplaintFilter = (typeof COMPLAINT_FILTERS)[number];
export const parseComplaintFilter = (value: string | undefined) =>
  pick(COMPLAINT_FILTERS, value, "open");

export const REQUEST_FILTERS = ["new", "contacted", "converted", "rejected"] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];
export const parseRequestFilter = (value: string | undefined) =>
  pick(REQUEST_FILTERS, value, "new");

export const USER_FILTERS = ["all", "blocked"] as const;
export type UserFilter = (typeof USER_FILTERS)[number];
export const parseUserFilter = (value: string | undefined) => pick(USER_FILTERS, value, "all");

/** searchParams qiymati (bir nechta bo'lsa — birinchisi) */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
