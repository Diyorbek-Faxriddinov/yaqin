import { describe, expect, it } from "vitest";
import { atLeastOne, PLACEHOLDER_PARAM } from "./static-params";

describe("atLeastOne", () => {
  it("bo'sh ro'yxat o'rniga placeholder (Cache Components build talabi)", () => {
    expect(atLeastOne([], "slug")).toEqual([{ slug: PLACEHOLDER_PARAM }]);
  });

  it("natija bo'lsa — o'zgarishsiz", () => {
    expect(atLeastOne([{ slug: "a" }], "slug")).toEqual([{ slug: "a" }]);
  });
});
