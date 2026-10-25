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
