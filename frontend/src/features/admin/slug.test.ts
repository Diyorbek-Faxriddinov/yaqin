import { describe, expect, it } from "vitest";
import { toKey, toSlug, uniqueKey } from "./slug";

describe("toSlug", () => {
  it("oʻzbekcha tutuq belgilarini olib tashlaydi", () => {
    expect(toSlug("Oʻyinchoqlar va sovgʻalar")).toBe("oyinchoqlar-va-sovgalar");
    expect(toSlug("  Taʼmir — 24/7 ")).toBe("tamir-24-7");
  });

  it("kirill yozuvidan bo'sh natija (administrator o'zi kiritadi)", () => {
    expect(toSlug("Часы")).toBe("");
  });
});

describe("toKey", () => {
  it("pastki chiziq bilan, harfdan boshlanadi", () => {
    expect(toKey("Kafolat muddati")).toBe("kafolat_muddati");
    expect(toKey("3D pechat")).toBe("d_pechat");
  });

  it("juda qisqa yoki lotin harfisiz — bo'sh", () => {
    expect(toKey("A")).toBe("");
    expect(toKey("Размер")).toBe("");
  });
});

describe("uniqueKey", () => {
  it("band kalitga raqam qo'shadi", () => {
    expect(uniqueKey("size", ["color"])).toBe("size");
    expect(uniqueKey("size", ["size", "size_2"])).toBe("size_3");
  });
});
