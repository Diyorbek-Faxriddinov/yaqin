import { describe, expect, it } from "vitest";
import { fitWithin } from "./fit";

describe("fitWithin", () => {
  it.each([
    [4000, 3000, 1600, { width: 1600, height: 1200 }],
    [3000, 4000, 1600, { width: 1200, height: 1600 }],
    [800, 600, 1600, { width: 800, height: 600 }],
    [1600, 1600, 1600, { width: 1600, height: 1600 }],
  ])("%d×%d (max %d)", (w, h, max, expected) => {
    expect(fitWithin(w, h, max)).toEqual(expected);
  });
});
