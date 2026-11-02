import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("MAP_STYLE_URL", () => {
  it("bo'sh qiymatda — standart uslub (Docker'da berilmagan build argumenti bo'sh satr)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STYLE_URL", "");
    const { MAP_STYLE_URL } = await import("./config");
    expect(MAP_STYLE_URL).toBe("https://tiles.openfreemap.org/styles/liberty");
  });

  it("berilgan provayder ishlatiladi", async () => {
    vi.stubEnv("NEXT_PUBLIC_MAP_STYLE_URL", "https://tiles.example.uz/style.json");
    const { MAP_STYLE_URL } = await import("./config");
    expect(MAP_STYLE_URL).toBe("https://tiles.example.uz/style.json");
  });
});
