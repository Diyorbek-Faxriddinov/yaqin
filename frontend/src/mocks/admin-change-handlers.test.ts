// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AdminBusiness,
  AdminChange,
  AdminChangeListItem,
  ApiError,
  BusinessOwners,
  OwnerBusiness,
  OwnerChange,
  PendingUpload,
} from "@/lib/api/types";
import { REVALIDATE_HEADER } from "./admin-common";
import { adminLogin, call, owner, photoUpload, post, type Session } from "./cabinet-test-utils";
import { BUSINESSES } from "./fixtures/businesses";

type Page = { items: AdminChangeListItem[]; total: number };

// Biznesda ko'pi bilan 3 ega — har test o'z biznesida (cabinet-handlers.test.ts dan keyingilari)
let next = 12;
let business = BUSINESSES[next]!;
let admin: Session;
let ownerSession: Session;
beforeEach(async () => {
  business = BUSINESSES[next++]!;
  admin = await adminLogin();
  ownerSession = await owner(business.id);
});

const changesPath = () => `/cabinet/businesses/${business.id}/changes`;

async function propose(body: unknown): Promise<OwnerChange> {
  const response = await post(changesPath(), ownerSession, body);
  expect(response.status, await response.clone().text()).toBe(201);
  return (await response.json()) as OwnerChange;
}

async function detail(id: string): Promise<AdminChange> {
  return (await (await call(`/admin/changes/${id}`, admin)).json()) as AdminChange;
}

const current = async () =>
  (await (await call(`/cabinet/businesses/${business.id}`, ownerSession)).json()) as OwnerBusiness;

describe("admin: egalar", () => {
  it("ro'yxat, faol havola, egalikni bekor qilish — kutilayotgan taklif qaytariladi", async () => {
    const list = (await (
      await call(`/admin/businesses/${business.id}/owners`, admin)
    ).json()) as BusinessOwners;
    expect(list.owners).toHaveLength(1);
    expect(list.owners[0]).toMatchObject({ provider: "demo", invitedBy: "Root (demo)" });
    expect(list.invite).toBeNull();
    expect(list.maxOwners).toBe(3);

    const change = await propose({ kind: "profile", profile: { description: "Yangi" } });
    const membership = list.owners[0]!.membershipId;
    const removed = await call(`/admin/businesses/${business.id}/owners/${membership}`, admin, {
      method: "DELETE",
    });
    expect(removed.status).toBe(204);
    expect((await detail(change.id)).status).toBe("withdrawn");
    expect((await call(`/cabinet/businesses/${business.id}`, ownerSession)).status).toBe(404);
  });

  it("havolani bekor qilish; faol havola yo'q — 404; moderatorga ruxsat yo'q", async () => {
    expect((await post(`/admin/businesses/${business.id}/owner-invite`, admin)).status).toBe(201);
    const path = `/admin/businesses/${business.id}/owner-invite`;
    expect((await call(path, admin, { method: "DELETE" })).status).toBe(204);
    expect((await call(path, admin, { method: "DELETE" })).status).toBe(404);

    const moderator = await adminLogin("moderator");
    expect((await post(path, moderator)).status).toBe(403);
    expect((await call("/admin/changes", moderator)).status).toBe(403);
  });
});

describe("admin: takliflar", () => {
  it("navbat: eng eskisi birinchi, biznes bo'yicha filtr; solishtiruv — hozir va taklif", async () => {
    const before = await current();
    const first = await propose({ kind: "profile", profile: { name: `${before.name} (yangi)` } });
    // Rasmi yo'q biznes — bo'sh ro'yxat o'zgarish emas, shuning uchun mahsulot taklifi
    await propose({ kind: "item.delete", itemId: before.items[0]!.id });

    const page = (await (
      await call(`/admin/changes?status=pending&businessId=${business.id}`, admin)
    ).json()) as Page;
    expect(page.items.map((c) => c.kind)).toEqual(["profile", "item.delete"]);
    expect(page.items[1]?.itemName).toBe(before.items[0]!.name);
    expect(page.items[0]).toMatchObject({ important: true, conflict: false });

    const change = await detail(first.id);
    expect(change.fields).toEqual([
      expect.objectContaining({
        field: "name",
        important: true,
        conflict: false,
        before: before.name,
        current: before.name,
        after: `${before.name} (yangi)`,
      }),
    ]);
    expect((await call("/admin/changes?status=nima", admin)).status).toBe(400);
  });

  it("tasdiqlash: maʼlumot saytga chiqadi, kesh yangilanadi; takroriy — 409; egasi holatni ko'radi", async () => {
    const change = await propose({ kind: "profile", profile: { telegram: "yangi_kanal" } });
    const approved = await post(`/admin/changes/${change.id}/approve`, admin);
    expect(approved.status).toBe(200);
    expect(approved.headers.get(REVALIDATE_HEADER)).toContain(`business:${business.slug}`);
    expect(((await approved.json()) as AdminChange).status).toBe("approved");

    const record = (await (
      await call(`/admin/businesses/${business.id}`, admin)
    ).json()) as AdminBusiness;
    expect(record.telegram).toBe("yangi_kanal");
    expect((await post(`/admin/changes/${change.id}/approve`, admin)).status).toBe(409);

    const own = (await (await call(changesPath(), ownerSession)).json()) as OwnerChange[];
    expect(own[0]).toMatchObject({ status: "approved", mine: true });
  });

  it("ziddiyat: taklifdan keyin admin o'zgartirsa — belgilanadi, lekin tasdiq to'xtamaydi", async () => {
    const change = await propose({ kind: "profile", profile: { website: "https://birinchi.uz" } });
    await call(`/admin/businesses/${business.id}`, admin, {
      method: "PATCH",
      body: JSON.stringify({ website: "https://admin.uz" }),
    });
    const view = await detail(change.id);
    expect(view.conflict).toBe(true);
    expect(view.fields[0]).toMatchObject({ conflict: true, current: "https://admin.uz" });
    expect((await post(`/admin/changes/${change.id}/approve`, admin)).status).toBe(200);
  });

  it("rad etish: sabab majburiy, egasiga ko'rinadi, yangi rasm o'chiriladi", async () => {
    const upload = (await (await photoUpload(ownerSession, business.id)).json()) as PendingUpload;
    const change = await propose({ kind: "photos", photos: [{ uploadId: upload.id }] });
    const view = await detail(change.id);
    const preview = (view.fields[0]?.after as Array<{ url: string; new: boolean }>)[0]!;
    expect(preview.new).toBe(true);
    expect((await call(preview.url.replace("/api/v1", ""), admin)).status).toBe(200);

    expect((await post(`/admin/changes/${change.id}/reject`, admin, { reason: "a" })).status).toBe(
      400,
    );
    const rejected = await post(`/admin/changes/${change.id}/reject`, admin, {
      reason: "Rasm biznesga tegishli emas",
    });
    expect(((await rejected.json()) as AdminChange).rejectionReason).toBe(
      "Rasm biznesga tegishli emas",
    );
    const own = (await (await call(changesPath(), ownerSession)).json()) as OwnerChange[];
    expect(own[0]).toMatchObject({
      status: "rejected",
      rejectionReason: "Rasm biznesga tegishli emas",
    });
    expect((await call(upload.previewUrl.replace("/api/v1", ""), ownerSession)).status).toBe(404);
  });

  it("rasmlar va mahsulotlar: tasdiqlangach ochiq bo'ladi", async () => {
    const upload = (await (await photoUpload(ownerSession, business.id)).json()) as PendingUpload;
    const photos = await propose({
      kind: "photos",
      photos: [{ uploadId: upload.id, alt: "Kirish" }],
    });
    expect((await post(`/admin/changes/${photos.id}/approve`, admin)).status).toBe(200);
    const after = await current();
    expect(after.photos).toHaveLength(1);
    expect(after.photos[0]?.alt).toBe("Kirish");
    expect((await call(after.photos[0]!.url.replace("/api/v1", ""), null)).status).toBe(200);

    const item = after.items[0]!;
    const input = {
      kind: item.kind,
      name: "Yangi xizmat turi",
      group: item.group,
      description: null,
      price: item.price,
      durationMinutes: item.durationMinutes,
      attributes: [],
      isAvailable: true,
    };
    const create = await propose({ kind: "item.create", item: input, photos: [] });
    const created = await detail(create.id);
    expect(created.itemName).toBe("Yangi xizmat turi");
    expect(created.fields.find((f) => f.field === "item.name")).toMatchObject({
      before: null,
      current: null,
      after: "Yangi xizmat turi",
    });
    expect((await post(`/admin/changes/${create.id}/approve`, admin)).status).toBe(200);
    expect((await current()).items.map((i) => i.name)).toContain("Yangi xizmat turi");

    const remove = await propose({ kind: "item.delete", itemId: item.id });
    expect((await detail(remove.id)).fields[0]).toMatchObject({ field: "item", after: null });
    expect((await post(`/admin/changes/${remove.id}/approve`, admin)).status).toBe(200);
    expect((await current()).items.map((i) => i.id)).not.toContain(item.id);
  });

  it("o'chirilgan mahsulotni o'zgartirish taklifi — 409 target_missing", async () => {
    const item = (await current()).items[0]!;
    const update = await propose({
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
        isAvailable: !item.isAvailable,
      },
      photos: [],
    });
    await call(`/admin/businesses/${business.id}/items/${item.id}`, admin, { method: "DELETE" });
    const response = await post(`/admin/changes/${update.id}/approve`, admin);
    expect(response.status).toBe(409);
    expect(((await response.json()) as ApiError).code).toBe("target_missing");
  });
});
