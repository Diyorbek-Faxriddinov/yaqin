// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { beforeEach, describe, expect, it } from "vitest";
import type {
  AdminBusiness,
  ApiError,
  OwnedBusiness,
  OwnerBusiness,
  OwnerChange,
  PendingUpload,
} from "@/lib/api/types";
import {
  adminLogin,
  call,
  invite,
  owner,
  photoUpload,
  post,
  userLogin,
} from "./cabinet-test-utils";
import { BUSINESSES } from "./fixtures/businesses";

describe("egalik taklifi", () => {
  const business = BUSINESSES[1]!;

  it("havola bir martalik; takroriy bosish xato emas; noto'g'ri token — 404", async () => {
    const token = await invite(business.id);
    const first = await userLogin();
    const accepted = await post("/cabinet/invites/accept", first, { token });
    expect(accepted.status).toBe(200);
    expect(((await accepted.json()) as OwnedBusiness).name).toBe(business.name);

    const list = (await (await call("/cabinet/businesses", first)).json()) as OwnedBusiness[];
    expect(list.map((b) => b.id)).toEqual([business.id]);

    // Boshqa foydalanuvchi shu havola bilan — ishlatilgan
    const second = await userLogin();
    expect((await post("/cabinet/invites/accept", second, { token })).status).toBe(404);
    expect((await post("/cabinet/invites/accept", second, { token: "x".repeat(40) })).status).toBe(
      404,
    );
    expect((await post("/cabinet/invites/accept", second, { token: "qisqa" })).status).toBe(400);
  });

  it("kirmasdan — 401; egasi bo'lmagan biznes — 404", async () => {
    expect((await call("/cabinet/businesses", null)).status).toBe(401);
    const stranger = await userLogin();
    expect((await call(`/cabinet/businesses/${business.id}`, stranger)).status).toBe(404);
    expect((await call("/cabinet/businesses", stranger)).status).toBe(200);
  });

  it("egalar soni chegarasi — 409 owner_limit", async () => {
    const target = BUSINESSES[2]!;
    for (let i = 0; i < 3; i += 1) await owner(target.id);
    const admin = await adminLogin();
    const response = await post(`/admin/businesses/${target.id}/owner-invite`, admin);
    expect(response.status).toBe(409);
    expect(((await response.json()) as ApiError).code).toBe("owner_limit");
  });

  it("egalikdan chiqish — biznes ro'yxatdan yo'qoladi, kutilayotgan taklif qaytariladi", async () => {
    const target = BUSINESSES[3]!;
    const session = await owner(target.id);
    await post(`/cabinet/businesses/${target.id}/changes`, session, {
      kind: "profile",
      profile: { description: "Yangi tavsif" },
    });
    expect(
      (await call(`/cabinet/businesses/${target.id}/membership`, session, { method: "DELETE" }))
        .status,
    ).toBe(204);
    expect((await call(`/cabinet/businesses/${target.id}`, session)).status).toBe(404);
  });
});

describe("takliflar", () => {
  // Biznesda ko'pi bilan 3 ega — har test o'z biznesida
  let next = 4;
  let business = BUSINESSES[next]!;
  beforeEach(() => {
    business = BUSINESSES[next++]!;
  });

  it("profil: faqat o'zgargan maydonlar; saytda darhol o'zgarmaydi; yangisi eskisini almashtiradi", async () => {
    const session = await owner(business.id);
    const path = `/cabinet/businesses/${business.id}/changes`;
    const before = (await (
      await call(`/cabinet/businesses/${business.id}`, session)
    ).json()) as OwnerBusiness;

    const first = await post(path, session, {
      kind: "profile",
      profile: { name: before.name, description: "Birinchi tavsif" },
    });
    expect(first.status).toBe(201);
    const change = (await first.json()) as OwnerChange;
    expect(change).toMatchObject({ kind: "profile", status: "pending", fields: ["description"] });

    // Joriy maʼlumot o'zgarmagan — moderator tasdig'i kerak
    const current = (await (
      await call(`/cabinet/businesses/${business.id}`, session)
    ).json()) as OwnerBusiness;
    expect(current.description).toBe(before.description);

    await post(path, session, { kind: "profile", profile: { description: "Ikkinchi tavsif" } });
    const list = (await (await call(path, session)).json()) as OwnerChange[];
    expect(list.map((c) => c.status)).toEqual(["pending", "superseded"]);

    const owned = (await (await call("/cabinet/businesses", session)).json()) as OwnedBusiness[];
    expect(owned[0]?.pendingChanges).toBe(1);
  });

  it("validatsiya: noto'g'ri maydon — 400 fields; o'zgarish yo'q — non_field_errors; rozilik yuborib bo'lmaydi", async () => {
    const session = await owner(business.id);
    const path = `/cabinet/businesses/${business.id}/changes`;
    const bad = await post(path, session, { kind: "profile", profile: { name: "A" } });
    expect(bad.status).toBe(400);
    expect(((await bad.json()) as ApiError).fields?.name).toBeDefined();

    const current = (await (
      await call(`/cabinet/businesses/${business.id}`, session)
    ).json()) as OwnerBusiness;
    const same = await post(path, session, { kind: "profile", profile: { name: current.name } });
    expect(((await same.json()) as ApiError).fields?.non_field_errors).toBeDefined();

    const consent = await post(path, session, {
      kind: "profile",
      profile: { consent: { givenBy: "Men", givenAt: new Date().toISOString() } },
    });
    expect(((await consent.json()) as ApiError).fields?.profile).toBeDefined();
  });

  it("rasm: yuklangani faqat egasiga ko'rinadi, taklifga qo'shiladi; qaytarib olish", async () => {
    const session = await owner(business.id);
    const upload = await photoUpload(session, business.id);
    expect(upload.status).toBe(201);
    const pending = (await upload.json()) as PendingUpload;

    const preview = await call(pending.previewUrl.replace("/api/v1", ""), session);
    expect(preview.status).toBe(200);
    expect(preview.headers.get("cache-control")).toBe("private, no-store");
    expect((await call(pending.previewUrl.replace("/api/v1", ""), await userLogin())).status).toBe(
      404,
    );
    expect((await photoUpload(session, business.id, "text/plain")).status).toBe(400);

    const path = `/cabinet/businesses/${business.id}/changes`;
    const created = await post(path, session, {
      kind: "photos",
      photos: [{ uploadId: pending.id, alt: null }],
    });
    expect(created.status).toBe(201);
    const change = (await created.json()) as OwnerChange;
    expect(change.fields).toEqual(["photos"]);

    // Noma'lum yuklama — 400
    const unknown = await post(path, session, {
      kind: "photos",
      photos: [{ uploadId: crypto.randomUUID() }],
    });
    expect(unknown.status).toBe(400);

    const withdrawn = await post(`${path}/${change.id}/withdraw`, session);
    expect(((await withdrawn.json()) as OwnerChange).status).toBe("withdrawn");
    expect((await post(`${path}/${change.id}/withdraw`, session)).status).toBe(409);
    // Qaytarib olingan taklif rasmi o'chiriladi
    expect((await call(pending.previewUrl.replace("/api/v1", ""), session)).status).toBe(404);
  });

  it("mahsulot: yangi, o'zgartirish va o'chirish takliflari", async () => {
    const session = await owner(business.id);
    const path = `/cabinet/businesses/${business.id}/changes`;
    const current = (await (
      await call(`/cabinet/businesses/${business.id}`, session)
    ).json()) as OwnerBusiness;
    const item = current.items[0]!;
    const input = {
      kind: item.kind,
      name: item.name,
      group: item.group,
      description: item.description,
      price: item.price,
      durationMinutes: item.durationMinutes,
      attributes: item.attributeValues,
      isAvailable: item.isAvailable,
    };

    const update = await post(path, session, {
      kind: "item.update",
      itemId: item.id,
      item: { ...input, isAvailable: !item.isAvailable },
      photos: item.photos.map((p) => ({ photoId: p.id, alt: p.alt })),
    });
    expect(update.status).toBe(201);
    expect(((await update.json()) as OwnerChange).fields).toEqual(["item.isAvailable"]);

    const create = await post(path, session, {
      kind: "item.create",
      item: { ...input, name: "Yangi xizmat" },
      photos: [],
    });
    expect(((await create.json()) as OwnerChange).itemId).toBeNull();

    const remove = await post(path, session, { kind: "item.delete", itemId: item.id });
    // O'chirish taklifi shu mahsulotning o'zgartirish taklifini almashtiradi
    expect(((await remove.json()) as OwnerChange).fields).toEqual(["item"]);
    const list = (await (await call(path, session)).json()) as OwnerChange[];
    expect(list.filter((c) => c.itemId === item.id).map((c) => c.status)).toEqual([
      "pending",
      "superseded",
    ]);

    expect(
      (await post(path, session, { kind: "item.delete", itemId: crypto.randomUUID() })).status,
    ).toBe(400);
  });

  it("biznes ochiq maʼlumoti taklifdan o'zgarmaydi (admin ko'radi)", async () => {
    const session = await owner(business.id);
    await post(`/cabinet/businesses/${business.id}/changes`, session, {
      kind: "profile",
      profile: { telegram: "yangi_kanal" },
    });
    const admin = await adminLogin();
    const record = (await (
      await call(`/admin/businesses/${business.id}`, admin)
    ).json()) as AdminBusiness;
    expect(record.telegram).not.toBe("yangi_kanal");
  });
});
