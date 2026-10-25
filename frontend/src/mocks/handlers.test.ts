import { describe, expect, it } from "vitest";
import type { BusinessPage, CategoryDetail, CategoryNode } from "@/lib/api/types";
import { mockFetch } from "./fetch";

const BASE = "http://demo.test/api/v1";

async function get<T>(path: string): Promise<{ status: number; body: T }> {
  const response = await mockFetch(new Request(`${BASE}${path}`));
  return { status: response.status, body: (await response.json()) as T };
}

describe("demo API (kontraktga moslik)", () => {
  it("kategoriyalar daraxti: 12 ta yuqori daraja, nomlar tanlangan tilda", async () => {
    const { status, body } = await get<CategoryNode[]>("/categories?lang=ru");
    expect(status).toBe(200);
    expect(body).toHaveLength(12);
    expect(body[0]?.name).toBe("Магазины");
    expect(body.every((c) => c.children.length > 0)).toBe(true);
  });

  it("ota-kategoriya hisobida ichki kategoriyalardagi bizneslar ham bor", async () => {
    const { body } = await get<CategoryNode[]>("/categories");
    const beauty = body.find((c) => c.slug === "gozallik");
    const childrenSum = beauty?.children.reduce((sum, c) => sum + c.businessCount, 0);
    expect(beauty?.businessCount).toBe(childrenSum);
    expect(beauty?.businessCount).toBeGreaterThan(0);
  });

  it("kategoriya tafsiloti: ota-kategoriya bilan; noma'lum slug — 404", async () => {
    const { body } = await get<CategoryDetail>("/categories/sartaroshxonalar");
    expect(body.parent?.slug).toBe("gozallik");
    expect((await get("/categories/yoq-narsa")).status).toBe(404);
  });

  it("kategoriya filtri ichki kategoriyalarni ham qamraydi", async () => {
    const { body } = await get<BusinessPage>("/businesses?category=gozallik&pageSize=50");
    expect(body.total).toBeGreaterThan(0);
    const leafSlugs = new Set(body.items.map((b) => b.category.slug));
    expect(leafSlugs.has("sartaroshxonalar")).toBe(true);
    expect(leafSlugs.has("restoranlar")).toBe(false);
  });

  it("kirill so'rov bilan qidiruv", async () => {
    const { body } = await get<BusinessPage>(`/businesses?q=${encodeURIComponent("сартарош")}`);
    expect(body.total).toBeGreaterThan(0);
    expect(body.items.every((b) => b.category.slug === "sartaroshxonalar")).toBe(true);
  });

  it("rus tilidagi kategoriya nomi bilan qidiruv", async () => {
    const { body } = await get<BusinessPage>(`/businesses?q=${encodeURIComponent("аптека")}`);
    expect(body.items.some((b) => b.category.slug === "dorixonalar")).toBe(true);
  });

  it("joylashuv berilsa — masofa va masofa bo'yicha saralash", async () => {
    const { body } = await get<BusinessPage>("/businesses?lat=41.2755&lng=69.2042&sort=distance");
    const distances = body.items.map((b) => b.distanceMeters ?? -1);
    expect(distances.every((d) => d >= 0)).toBe(true);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it("sort=distance joylashuvsiz — 400", async () => {
    const { status, body } = await get<{ code: string }>("/businesses?sort=distance");
    expect(status).toBe(400);
    expect(body.code).toBe("validation_error");
  });

  it("noto'g'ri parametrlar — 400", async () => {
    expect((await get("/businesses?pageSize=500")).status).toBe(400);
    expect((await get("/businesses?lat=41.3")).status).toBe(400);
  });

  it("sahifalash", async () => {
    const first = await get<BusinessPage>("/businesses?pageSize=5&page=1");
    const second = await get<BusinessPage>("/businesses?pageSize=5&page=2");
    expect(first.body.items).toHaveLength(5);
    expect(first.body.items[0]?.id).not.toBe(second.body.items[0]?.id);
    expect(first.body.total).toBe(second.body.total);
  });

  it("narxlar tiyinda", async () => {
    const { body } = await get<BusinessPage>("/businesses?q=ustoz");
    expect(body.items[0]?.priceRange?.min).toEqual({ amount: 4_000_000, currency: "UZS" });
  });

  it("noma'lum endpoint — 404, tarmoqqa chiqmaydi", async () => {
    expect((await get("/yoq")).status).toBe(404);
  });
});
