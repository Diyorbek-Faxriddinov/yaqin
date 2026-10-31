// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { describe, expect, it } from "vitest";
import type {
  BusinessPage,
  CategoryDetail,
  CategoryNode,
  Item,
  MapMarker,
  ReviewPage,
  SearchSuggestions,
} from "@/lib/api/types";
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

  it("mahsulot va xizmatlar: narx turi va davomiylik", async () => {
    const { status, body } = await get<Item[]>("/businesses/ustoz-sartaroshxonasi/items");
    expect(status).toBe(200);
    expect(body.length).toBeGreaterThan(0);
    const haircut = body.find((i) => i.slug === "erkaklar-soch-turmagi");
    expect(haircut?.kind).toBe("service");
    expect(haircut?.durationMinutes).toBe(40);
    expect(haircut?.price.type).toBe("fixed");
    expect(haircut?.price.min?.amount ?? 0).toBeGreaterThan(0);
  });

  it("bitta mahsulot; noma'lum — 404", async () => {
    const ok = await get<Item>("/businesses/ustoz-sartaroshxonasi/items/erkaklar-soch-turmagi");
    expect(ok.body.name).toBe("Erkaklar soch turmagi");
    expect((await get("/businesses/ustoz-sartaroshxonasi/items/yoq")).status).toBe(404);
    expect((await get("/businesses/yoq/items")).status).toBe(404);
  });

  it("sharhlar soni biznes reytingi soniga teng, yangilari birinchi", async () => {
    const { body } = await get<ReviewPage>("/businesses/ustoz-sartaroshxonasi/reviews?pageSize=10");
    expect(body.total).toBe(37);
    expect(body.items).toHaveLength(10);
    const dates = body.items.map((r) => r.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("xarita nuqtalari filtrlar bilan", async () => {
    const all = await get<MapMarker[]>("/map/markers");
    const beauty = await get<MapMarker[]>("/map/markers?category=gozallik");
    expect(all.body.length).toBeGreaterThan(beauty.body.length);
    expect(beauty.body.every((m) => typeof m.location.lat === "number")).toBe(true);
  });
});

describe("mahsulot bo'yicha qidiruv va xususiyatlar (ADR-0014)", () => {
  it("mahsulot nomi bilan topiladi; natijada qaysi mahsulot mos kelgani", async () => {
    const { body } = await get<BusinessPage>("/businesses?q=krossovka&pageSize=50");
    expect(body.total).toBeGreaterThan(0);
    for (const business of body.items) {
      expect(business.category.slug).toBe("poyabzal");
      expect(business.matchedItems).toEqual([{ slug: "krossovka", name: "Krossovka" }]);
    }
    // Kirill yozuvida ham
    const cyrillic = await get<BusinessPage>("/businesses?q=кроссовка&pageSize=50");
    expect(cyrillic.body.total).toBe(body.total);
    // Biznes nomi yoki kategoriya bo'yicha topilganda — bo'sh
    const byCategory = await get<BusinessPage>("/businesses?q=poyabzal");
    expect(byCategory.body.items.every((b) => b.matchedItems.length === 0)).toBe(true);
  });

  it("qidiruv takliflarida mahsulotlar", async () => {
    const { body } = await get<SearchSuggestions>("/search/suggest?q=krossovka");
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0]).toMatchObject({ slug: "krossovka", name: "Krossovka" });
  });

  it("kategoriya xususiyatlari so'ralgan tilda", async () => {
    const shops = await get<BusinessPage>("/businesses?category=kiyim-kechak");
    const slug = shops.body.items[0]!.slug;
    const ru = await get<Item>(`/businesses/${slug}/items/erkaklar-koylagi?lang=ru`);
    expect(ru.body.attributes).toEqual([
      { key: "size", name: "Размер", value: "S, M, L, XL, XXL" },
      { key: "rang", name: "Rang", value: "Oq, koʻk" },
      { key: "material", name: "Материал", value: "Paxta" },
    ]);
  });
});
