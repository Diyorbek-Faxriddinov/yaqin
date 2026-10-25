import type { Money } from "@/lib/format/price";

/**
 * Biznesning hozirgi ish holati. Hisoblash (ish vaqti jadvali, tanaffus, yarim tundan
 * keyin yopilish) 2.4-qadamda `lib/open-status` da bo'ladi; komponentlar faqat natijani oladi.
 */
export type OpenState = "open" | "closingSoon" | "closed" | "unknown";

export type OpenStatus = {
  state: OpenState;
  /** Tayyor formatlangan izoh: "21:00 gacha", "ertaga 09:00 da" */
  detail?: string;
};

export type RatingSummary = {
  /** 1–5 oralig'ida */
  average: number;
  count: number;
};

export type PriceRange = {
  min: Money;
  max: Money;
};
