import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/api/types";
import { catalogTitleKey, defaultKind } from "./catalog";

const item = (kind: Item["kind"]) => ({ kind });

describe("katalog sarlavhasi turlarga qarab", () => {
  it("faqat mahsulot — Mahsulotlar, faqat xizmat — Xizmatlar, aralash yoki bo'sh — umumiy", () => {
    expect(catalogTitleKey([item("product"), item("product")])).toBe("products");
    expect(catalogTitleKey([item("service")])).toBe("services");
    expect(catalogTitleKey([item("product"), item("service")])).toBe("catalog");
    expect(catalogTitleKey([])).toBe("catalog");
  });
});

describe("yangi mahsulot turi (admin)", () => {
  it("katalog bo'sh bo'lsa — kategoriyaga qarab", () => {
    expect(defaultKind([], "shopping")).toBe("product");
    expect(defaultKind([], "food")).toBe("product");
    expect(defaultKind([], "beauty")).toBe("service");
    expect(defaultKind([], null)).toBe("service");
  });

  it("katalogda — ko'pchilik turi", () => {
    expect(defaultKind([item("service"), item("product"), item("product")], "beauty")).toBe(
      "product",
    );
    expect(defaultKind([item("service"), item("service"), item("product")], "shopping")).toBe(
      "service",
    );
  });
});
