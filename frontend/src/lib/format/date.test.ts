import { describe, expect, it } from "vitest";
import { formatDate, formatShortDay } from "./date";

describe("formatDate", () => {
  it("oʻzbekcha oy nomi Intl'ga bogʻliq emas", () => {
    expect(formatDate("2026-10-12T08:00:00Z", "uz")).toBe("12-oktabr, 2026");
  });

  it("Toshkent vaqti (UTC+5): UTC kechqurun — keyingi kun", () => {
    expect(formatDate("2026-12-31T20:00:00Z", "uz")).toBe("1-yanvar, 2027");
  });

  it("ruscha — Intl orqali", () => {
    expect(formatDate("2026-10-12T08:00:00Z", "ru")).toMatch(/12 октября 2026/);
  });
});

describe("formatShortDay", () => {
  it("kalendar kuni vaqt zonasiga bog'liq emas", () => {
    expect(formatShortDay("2026-10-05", "uz")).toBe("5-okt");
    expect(formatShortDay("2026-01-31", "ru")).toMatch(/31 янв/);
  });
});
