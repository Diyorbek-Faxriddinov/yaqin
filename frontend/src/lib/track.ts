"use client";

import type { components } from "@/lib/api/schema";

export type StatsEventType = components["schemas"]["StatsEvent"]["type"];

/**
 * Biznes statistikasi uchun hodisa (ko'rish, qo'ng'iroq bosish, ...).
 * Shaxsiy maʼlumot yuborilmaydi; xato foydalanuvchiga ta'sir qilmaydi.
 * keepalive — havola bosilib sahifa yopilsa ham so'rov yetib boradi.
 */
export function trackEvent(type: StatsEventType, businessId: string): void {
  try {
    void fetch("/api/v1/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, businessId }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Statistika hech qachon asosiy funksiyani buzmasligi kerak
  }
}
