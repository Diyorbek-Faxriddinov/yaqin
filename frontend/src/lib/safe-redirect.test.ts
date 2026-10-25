import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it.each([
    ["/profil/sevimlilar", "/profil/sevimlilar"],
    ["/biznes/barber-bek#reviews", "/biznes/barber-bek#reviews"],
    ["/qidiruv?q=kafe", "/qidiruv?q=kafe"],
  ])("ichki yo'l qabul qilinadi: %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "evil.com",
    "/\u0000//evil.com",
    "",
    null,
    undefined,
  ])("xavfli yoki bo'sh qiymat — standart manzil: %s", (input) => {
    expect(safeNextPath(input)).toBe("/profil");
  });
});
