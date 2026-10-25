import { describe, expect, it } from "vitest";
import { googleDirectionsUrl, yandexDirectionsUrl } from "../directions";
import { formatDuration } from "./duration";
import { formatPhone, normalizeUzPhone, telHref } from "./phone";

const NBSP = " ";

describe("formatPhone", () => {
  it("O'zbekiston raqamini guruhlaydi", () => {
    expect(formatPhone("+998901234567")).toBe(["+998", "90", "123", "45", "67"].join(NBSP));
  });

  it("boshqa formatni o'zgartirmaydi", () => {
    expect(formatPhone("+12025550123")).toBe("+12025550123");
  });

  it("tel: havolasi", () => {
    expect(telHref("+998 90 123-45-67")).toBe("tel:+998901234567");
  });
});

describe("formatDuration", () => {
  it.each([
    [30, "uz", `30${NBSP}daq`],
    [60, "uz", `1${NBSP}soat`],
    [90, "uz", `1${NBSP}soat 30${NBSP}daq`],
    [150, "ru", `2${NBSP}ч 30${NBSP}мин`],
    [0, "uz", `0${NBSP}daq`],
  ] as const)("%d (%s) → %s", (minutes, locale, expected) => {
    expect(formatDuration(minutes, locale)).toBe(expected);
  });
});

describe("yo'l ko'rsatish havolalari", () => {
  const point = { lat: 41.311, lng: 69.28 };

  it("Yandex", () => {
    expect(yandexDirectionsUrl(point)).toBe("https://yandex.uz/maps/?rtext=~41.311,69.28&rtt=auto");
  });

  it("Google", () => {
    expect(googleDirectionsUrl(point)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=41.311,69.28",
    );
  });
});

describe("normalizeUzPhone", () => {
  it.each([
    ["90 123 45 67", "+998901234567"],
    ["+998 (90) 123-45-67", "+998901234567"],
    ["998901234567", "+998901234567"],
    ["12345", null],
    ["+7 912 345 67 89", null],
  ])("%s → %s", (input, expected) => {
    expect(normalizeUzPhone(input)).toBe(expected);
  });
});
