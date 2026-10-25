import { describe, expect, it } from "vitest";
import { formatDate } from "./date";

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
