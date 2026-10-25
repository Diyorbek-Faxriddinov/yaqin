import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeForSearch } from "./normalize";

describe("normalizeForSearch", () => {
  it.each([
    ["Doʻkon", "dokon"],
    ["Do'kon", "dokon"],
    ["Do‘kon", "dokon"],
    ["Do`kon", "dokon"],
    ["Дўкон", "dokon"],
    ["Сартарошхона", "sartaroshxona"],
    ["Ҳаммом", "hammom"],
    ["Ғишт", "gisht"],
    ["Парикмахерская", "parikmaxerskaya"],
    ["  Mirzo   Ulugʻbek  ", "mirzo ulugbek"],
    ["Kafe «Baraka»", "kafe baraka"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeForSearch(input)).toBe(expected);
  });
});

describe("matchesQuery", () => {
  const text = "Baraka sartaroshxonasi Chilonzor Sartaroshxona Парикмахерская";

  it("lotin so'rov lotin matnga mos", () => {
    expect(matchesQuery(text, "sartarosh")).toBe(true);
  });

  it("kirill so'rov lotin matnga mos", () => {
    expect(matchesQuery(text, "сартарош")).toBe(true);
  });

  it("rus so'rov rus nomiga mos", () => {
    expect(matchesQuery(text, "парикмахер")).toBe(true);
  });

  it("barcha so'zlar uchrashi kerak", () => {
    expect(matchesQuery(text, "baraka chilonzor")).toBe(true);
    expect(matchesQuery(text, "baraka yunusobod")).toBe(false);
  });

  it("so'z oxiridagi qo'shimcha farqi", () => {
    expect(matchesQuery("Dorixonalar Аптеки", "аптека")).toBe(true);
    expect(matchesQuery("Restoranlar", "restoran")).toBe(true);
  });

  it("qisqa so'zlar to'liq mos kelishi kerak", () => {
    expect(matchesQuery("Kafe", "kafx")).toBe(false);
  });

  it("bo'sh so'rov hammaga mos", () => {
    expect(matchesQuery(text, "   ")).toBe(true);
  });
});
