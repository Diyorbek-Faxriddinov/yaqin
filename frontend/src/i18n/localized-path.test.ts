import { describe, expect, it } from "vitest";
import { localizedPath } from "./localized-path";

describe("localizedPath", () => {
  it.each([
    ["/", "uz", "/"],
    ["/", "ru", "/ru"],
    ["/kategoriya/avto", "uz", "/kategoriya/avto"],
    ["/kategoriya/avto", "ru", "/ru/kategoriya/avto"],
    ["qidiruv", "ru", "/ru/qidiruv"],
  ] as const)("%s (%s) → %s", (pathname, locale, expected) => {
    expect(localizedPath(pathname, locale)).toBe(expected);
  });
});
