import { describe, expect, it } from "vitest";
import { findActiveHref } from "./active-href";

const HREFS = ["/", "/qidiruv", "/xarita", "/profil/sevimlilar", "/profil"];

describe("findActiveHref", () => {
  it.each([
    ["/", "/"],
    ["/qidiruv", "/qidiruv"],
    ["/profil", "/profil"],
    ["/profil/sozlamalar", "/profil"],
    ["/profil/sevimlilar", "/profil/sevimlilar"],
    ["/biznes/non-markazi", null],
    ["/qidiruvlar", null],
  ])("%s → %s", (pathname, expected) => {
    expect(findActiveHref(pathname, HREFS)).toBe(expected);
  });
});
