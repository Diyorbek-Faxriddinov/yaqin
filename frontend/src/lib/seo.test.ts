import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteUrl, languageAlternates, pageMetadata } from "./seo";

describe("seo", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("asosiy til prefikssiz, rus tili /ru bilan; oxirgi / olib tashlanadi", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://yaqin.uz/");
    expect(absoluteUrl("/", "uz")).toBe("https://yaqin.uz/");
    expect(absoluteUrl("/", "ru")).toBe("https://yaqin.uz/ru");
    expect(absoluteUrl("/kategoriyalar", "ru")).toBe("https://yaqin.uz/ru/kategoriyalar");
  });

  it("hreflang: uz, ru va x-default", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://yaqin.uz");
    expect(languageAlternates("/haqida")).toEqual({
      uz: "https://yaqin.uz/haqida",
      ru: "https://yaqin.uz/ru/haqida",
      "x-default": "https://yaqin.uz/haqida",
    });
  });

  it("canonical joriy tilga, Open Graph lokali bilan", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://yaqin.uz");
    const metadata = pageMetadata({ path: "/xarita", locale: "ru", title: "Карта" });
    expect(metadata.alternates?.canonical).toBe("https://yaqin.uz/ru/xarita");
    expect(metadata.openGraph).toMatchObject({
      url: "https://yaqin.uz/ru/xarita",
      locale: "ru_RU",
      alternateLocale: ["uz_UZ"],
      title: "Карта",
    });
  });
});
