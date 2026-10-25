import { describe, expect, it } from "vitest";
import { formatPrice, formatPriceRange, groupDigits } from "./price";

const NBSP = " ";
const som = (value: number) => ({ amount: value * 100, currency: "UZS" as const });

describe("groupDigits", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, `1${NBSP}000`],
    [1234567, `1${NBSP}234${NBSP}567`],
    [-45000, `-45${NBSP}000`],
  ])("%d → %s", (input, expected) => {
    expect(groupDigits(input)).toBe(expected);
  });
});

describe("formatPrice", () => {
  it("o'zbekcha so'm bilan formatlaydi", () => {
    expect(formatPrice(som(45000), "uz")).toBe(`45${NBSP}000${NBSP}soʻm`);
  });

  it("ruscha сум bilan formatlaydi", () => {
    expect(formatPrice(som(45000), "ru")).toBe(`45${NBSP}000${NBSP}сум`);
  });

  it("tiyinni eng yaqin so'mgacha yaxlitlaydi", () => {
    expect(formatPrice({ amount: 4500050, currency: "UZS" }, "uz")).toBe(`45${NBSP}001${NBSP}soʻm`);
  });
});

describe("formatPriceRange", () => {
  it("oraliqni formatlaydi", () => {
    expect(formatPriceRange(som(50000), som(80000), "uz")).toBe(
      `50${NBSP}000${NBSP}–${NBSP}80${NBSP}000${NBSP}soʻm`,
    );
  });

  it("chegaralar teng bo'lsa bitta narx ko'rsatadi", () => {
    expect(formatPriceRange(som(30000), som(30000), "uz")).toBe(`30${NBSP}000${NBSP}soʻm`);
  });
});
