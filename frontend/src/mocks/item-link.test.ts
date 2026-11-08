// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { describe, expect, it } from "vitest";
import type { AdminChange, AdminItem, ApiError, Item, StatsSeries } from "@/lib/api/types";
import { adminLogin, call, owner, post } from "./cabinet-test-utils";
import { BUSINESSES } from "./fixtures/businesses";

const ITEM = {
  kind: "product",
  name: "Lavash",
  group: null,
  description: null,
  price: { type: "on_request", min: null, max: null },
  durationMinutes: null,
  attributes: [],
  isAvailable: true,
};

describe("mahsulot havolasi (mock)", () => {
  it("faqat ruxsat etilgan platformalar; ommaviy API'da koʻrinadi; yuborilmasa oʻzgarmaydi", async () => {
    const business = BUSINESSES[30]!;
    const admin = await adminLogin();
    const path = `/admin/businesses/${business.id}/items`;
    for (const link of ["http://instagram.com/p/a", "https://evil.example.com", "javascript:x"]) {
      const response = await post(path, admin, { ...ITEM, link });
      expect(response.status, link).toBe(400);
      expect(((await response.json()) as ApiError).fields?.link).toBeDefined();
    }
    const created = (await (
      await post(path, admin, { ...ITEM, link: "https://www.instagram.com/reel/abc/" })
    ).json()) as AdminItem;
    expect(created.link).toBe("https://www.instagram.com/reel/abc/");

    const items = (await (await call(`/businesses/${business.slug}/items`, null)).json()) as Item[];
    expect(items.find((i) => i.id === created.id)?.link).toBe(created.link);

    const updated = await call(`${path}/${created.id}`, admin, {
      method: "PUT",
      body: JSON.stringify({ ...ITEM, name: "Yangi lavash" }),
    });
    expect(((await updated.json()) as AdminItem).link).toBe(created.link);
  });

  it("havola bosilishi statistikada sanaladi", async () => {
    const business = BUSINESSES[31]!;
    const admin = await adminLogin();
    const before = (await (
      await call(`/admin/businesses/${business.id}/stats?days=7`, admin)
    ).json()) as StatsSeries;
    const event = await post("/events", null, { type: "link_click", businessId: business.id });
    expect(event.status).toBe(202);
    const after = (await (
      await call(`/admin/businesses/${business.id}/stats?days=7`, admin)
    ).json()) as StatsSeries;
    expect(after.totals.linkClicks).toBe(before.totals.linkClicks + 1);
  });

  it("egasi havola qoʻshsa — moderatorga «muhim»", async () => {
    const business = BUSINESSES[32]!;
    const session = await owner(business.id);
    const proposed = await post(`/cabinet/businesses/${business.id}/changes`, session, {
      kind: "item.create",
      item: { ...ITEM, link: "https://t.me/kanal/1" },
      photos: [],
    });
    const { id } = (await proposed.json()) as { id: string };
    const admin = await adminLogin();
    const view = (await (await call(`/admin/changes/${id}`, admin)).json()) as AdminChange;
    expect(view.important).toBe(true);
    expect(view.fields.find((f) => f.field === "item.link")).toMatchObject({
      important: true,
      after: "https://t.me/kanal/1",
    });
  });
});
