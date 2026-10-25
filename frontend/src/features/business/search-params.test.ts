import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filtersToQuery, parseFilters, withFilter } from "./search-params";

describe("parseFilters", () => {
  it("bo'sh parametrlar — standart filtrlar", () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });

  it("o'zbekcha parametrlarni o'qiydi", () => {
    expect(
      parseFilters({
        q: "  sartarosh ",
        tuman: "chilonzor",
        ochiq: "1",
        saralash: "yaqin",
        sahifa: "3",
        kategoriya: "gozallik",
      }),
    ).toEqual({
      q: "sartarosh",
      district: "chilonzor",
      category: "gozallik",
      openNow: true,
      sort: "distance",
      page: 3,
    });
  });

  it("noto'g'ri qiymatlarni e'tiborsiz qoldiradi", () => {
    expect(
      parseFilters({ tuman: "../etc", saralash: "random", sahifa: "-2", ochiq: "true" }),
    ).toEqual(DEFAULT_FILTERS);
  });

  it("massiv bo'lsa birinchisini oladi", () => {
    expect(parseFilters({ tuman: ["yunusobod", "chilonzor"] }).district).toBe("yunusobod");
  });
});

describe("filtersToQuery", () => {
  it("standart qiymatlar URL'ga yozilmaydi", () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe("");
  });

  it("parse ↔ query aylanmasi", () => {
    const query = "?q=kafe&tuman=chilonzor&ochiq=1&saralash=reyting&sahifa=2";
    const params = Object.fromEntries(new URLSearchParams(query));
    expect(filtersToQuery(parseFilters(params))).toBe(query);
  });
});

describe("withFilter", () => {
  it("filtr o'zgarganda sahifa 1 ga qaytadi", () => {
    const current = { ...DEFAULT_FILTERS, page: 4, district: "chilonzor" };
    expect(withFilter(current, { openNow: true })).toBe("?tuman=chilonzor&ochiq=1");
  });
});
