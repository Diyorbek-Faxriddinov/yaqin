// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { describe, expect, it } from "vitest";
import type { AdminItem, ApiError, BusinessPage, Item, OwnerBusiness } from "@/lib/api/types";
import { adminLogin, call, owner, post } from "./cabinet-test-utils";
import { BUSINESSES } from "./fixtures/businesses";

const ITEM = {
  kind: "product",
  name: "Sport poyabzal",
  group: null,
  description: null,
  price: { type: "on_request", min: null, max: null },
  durationMinutes: null,
  attributes: [],
  isAvailable: true,
};

const search = async (q: string) =>
  (await (await call(`/businesses?q=${encodeURIComponent(q)}`, null)).json()) as BusinessPage;

describe("qidiruv teglari (ADR-0016)", () => {
  it("teg biznes va mahsulotni topadi, ommaviy javobga chiqmaydi", async () => {
    const business = BUSINESSES[20]!;
    const admin = await adminLogin();
    const created = await post(`/admin/businesses/${business.id}/items`, admin, {
      ...ITEM,
      tags: ["qxkrossovka", "qxkrossovka ", "Кроссовки"],
    });
    const item = (await created.json()) as AdminItem;
    expect(item.tags).toEqual(["qxkrossovka", "Кроссовки"]);

    const page = await search("qxkrossovka");
    expect(page.relaxed).toBe(false);
    expect(page.items.map((b) => b.id)).toEqual([business.id]);
    expect(page.items[0]?.matchedItems).toEqual([{ slug: item.slug, name: "Sport poyabzal" }]);

    const suggest = (await (await call("/search/suggest?q=qxkrossovka", null)).json()) as {
      items: Array<{ name: string }>;
    };
    expect(suggest.items.map((i) => i.name)).toEqual(["Sport poyabzal"]);

    const items = (await (await call(`/businesses/${business.slug}/items`, null)).json()) as Item[];
    expect(items.every((entry) => !("tags" in entry))).toBe(true);
  });

  it("noto'g'ri teg — 400; yuborilmasa o'zgarmaydi", async () => {
    const business = BUSINESSES[21]!;
    const admin = await adminLogin();
    const path = `/admin/businesses/${business.id}/items`;
    for (const tags of [["a"], ["x".repeat(41)], ["!!"], "teg", [1]]) {
      const response = await post(path, admin, { ...ITEM, tags });
      expect(response.status).toBe(400);
      expect(((await response.json()) as ApiError).fields?.tags).toBeDefined();
    }
    const created = (await (
      await post(path, admin, { ...ITEM, tags: ["birinchi"] })
    ).json()) as AdminItem;
    const updated = await call(`${path}/${created.id}`, admin, {
      method: "PUT",
      body: JSON.stringify({ ...ITEM, name: "Yangi nom" }),
    });
    expect(((await updated.json()) as AdminItem).tags).toEqual(["birinchi"]);
  });

  it("takliflar: avval o'zi, keyin kategoriyadagilar; egasiga ham, begonaga — 404", async () => {
    const business = BUSINESSES[22]!;
    const admin = await adminLogin();
    await post(`/admin/businesses/${business.id}/items`, admin, { ...ITEM, tags: ["ozimniki"] });
    const other = BUSINESSES.find(
      (b) => b.categorySlug === business.categorySlug && b.id !== business.id,
    );
    if (other) {
      await post(`/admin/businesses/${other.id}/items`, admin, { ...ITEM, tags: ["umumiy"] });
    }
    const path = `/admin/businesses/${business.id}/tag-suggestions`;
    const { tags } = (await (await call(path, admin)).json()) as { tags: string[] };
    expect(tags[0]).toBe("ozimniki");
    if (other) expect(tags).toContain("umumiy");

    const session = await owner(business.id);
    const cabinet = `/cabinet/businesses/${business.id}/tag-suggestions`;
    expect((await call(cabinet, session)).status).toBe(200);
    const stranger = await owner(BUSINESSES[23]!.id);
    expect((await call(cabinet, stranger)).status).toBe(404);
  });

  it("egasi teglari tasdiqlanmaguncha qidiruvga kirmaydi", async () => {
    const business = BUSINESSES[24]!;
    const session = await owner(business.id);
    const current = (await (
      await call(`/cabinet/businesses/${business.id}`, session)
    ).json()) as OwnerBusiness;
    const item = current.items[0]!;
    const proposed = await post(`/cabinet/businesses/${business.id}/changes`, session, {
      kind: "item.update",
      itemId: item.id,
      item: {
        kind: item.kind,
        name: item.name,
        group: item.group,
        description: item.description,
        price: item.price,
        durationMinutes: item.durationMinutes,
        attributes: item.attributeValues,
        isAvailable: item.isAvailable,
        tags: ["qxegateg"],
      },
      photos: [],
    });
    const change = (await proposed.json()) as { id: string; fields: string[] };
    expect(change.fields).toEqual(["item.tags"]);
    expect((await search("qxegateg")).total).toBe(0);

    const admin = await adminLogin();
    expect((await post(`/admin/changes/${change.id}/approve`, admin)).status).toBe(200);
    expect((await search("qxegateg")).total).toBe(1);
  });
});

describe("yumshoq qidiruv", () => {
  it("hamma so'z mos kelsa — qattiq; bo'lmasa — belgi bilan; hech narsa — bo'sh", async () => {
    const strict = await search(BUSINESSES[0]!.name);
    expect(strict.relaxed).toBe(false);

    const loose = await search(`${BUSINESSES[0]!.name.split(" ")[0]} qxqxqxqx`);
    expect(loose.relaxed).toBe(true);
    expect(loose.items.map((b) => b.id)).toContain(BUSINESSES[0]!.id);

    const nothing = await search("qxqxqxqx");
    expect(nothing).toMatchObject({ total: 0, relaxed: false });
    expect((await search("qxqxqxqx zqzqzqzq wvwvwvwv")).total).toBe(0);
  });
});
