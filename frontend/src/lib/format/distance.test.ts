import { describe, expect, it } from "vitest";
import { formatDistance } from "./distance";
import { formatDecimal } from "./number";

const NBSP = " ";

describe("formatDistance", () => {
  it.each([
    [0, `0${NBSP}m`],
    [4, `0${NBSP}m`],
    [347, `350${NBSP}m`],
    [994, `990${NBSP}m`],
    [999, `1${NBSP}km`],
    [1000, `1${NBSP}km`],
    [1240, `1,2${NBSP}km`],
    [9940, `9,9${NBSP}km`],
    [12600, `13${NBSP}km`],
  ])("%d m → %s", (meters, expected) => {
    expect(formatDistance(meters, "uz")).toBe(expected);
  });

  it("rus tilida birliklar kirillda", () => {
    expect(formatDistance(350, "ru")).toBe(`350${NBSP}м`);
    expect(formatDistance(1500, "ru")).toBe(`1,5${NBSP}км`);
  });

  it("manfiy qiymatni 0 deb oladi", () => {
    expect(formatDistance(-20, "uz")).toBe(`0${NBSP}m`);
  });
});

describe("formatDecimal", () => {
  it("vergul bilan formatlaydi", () => {
    expect(formatDecimal(4.66)).toBe("4,7");
    expect(formatDecimal(5)).toBe("5,0");
  });
});
