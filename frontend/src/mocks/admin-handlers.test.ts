// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { describe, expect, it } from "vitest";
import type { AdminBusiness, AdminMe, AdminPhoto, BusinessPage, Item } from "@/lib/api/types";
import { REVALIDATE_HEADER } from "./admin-handlers";
import { demoState } from "./demo-state";
import { mockFetch } from "./fetch";

const BASE = "http://demo.test/api/v1";
type Session = { cookie: string; csrf: string };

async function post(path: string, body: unknown, session?: Session) {
  const headers = new Headers({ "content-type": "application/json" });
  if (session) {
    headers.set("cookie", session.cookie);
    headers.set("x-csrftoken", session.csrf);
  }
  return mockFetch(
    new Request(`${BASE}${path}`, { method: "POST", headers, body: JSON.stringify(body) }),
  );
}

function call(path: string, session: Session, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cookie", session.cookie);
  if (init.method && init.method !== "GET") headers.set("x-csrftoken", session.csrf);
  if (typeof init.body === "string") headers.set("content-type", "application/json");
  return mockFetch(new Request(`${BASE}${path}`, { ...init, headers }));
}

async function adminLogin(username = "root"): Promise<Session> {
  const step1 = await post("/admin/auth/login", { username, password: "yaqin-demo" });
  expect(step1.status).toBe(200);
  const { challengeToken } = (await step1.json()) as { challengeToken: string };
  const step2 = await post("/admin/auth/2fa", { challengeToken, code: "123456" });
  expect(step2.status).toBe(200);
  const cookies = step2.headers.getSetCookie();
  const session = cookies.find((c) => c.startsWith("adminsessionid="));
  expect(session).toContain("HttpOnly");
  expect(session).toContain("SameSite=Strict");
  const value = (name: string) =>
    cookies
      .find((c) => c.startsWith(`${name}=`))
      ?.split(";")[0]
      ?.split("=")[1] ?? "";
  return {
    cookie: `adminsessionid=${value("adminsessionid")}; csrftoken=${value("csrftoken")}`,
    csrf: value("csrftoken"),
  };
}

async function createDraft(
  session: Session,
  name = `Test biznes ${crypto.randomUUID().slice(0, 6)}`,
) {
  const response = await call("/admin/businesses", session, {
    method: "POST",
    body: JSON.stringify({ name, categorySlug: "sartaroshxonalar", districtSlug: "chilonzor" }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as AdminBusiness;
}

describe("admin kirishi", () => {
  it("parol + 2FA → sessiya; /admin/me ruxsatlar bilan", async () => {
    const session = await adminLogin();
    const me = (await (await call("/admin/me", session)).json()) as AdminMe;
    expect(me.isRoot).toBe(true);
    expect(me.permissions).toContain("staff.manage");
    expect(JSON.stringify(me)).not.toContain("yaqin-demo");
  });

  it("noto'g'ri parol — 401, login mavjudligi oshkor qilinmaydi", async () => {
    const wrongPassword = await post("/admin/auth/login", { username: "root", password: "x" });
    const unknownUser = await post("/admin/auth/login", { username: "yoq-admin", password: "x" });
    expect(wrongPassword.status).toBe(401);
    expect(((await wrongPassword.json()) as { message: string }).message).toBe(
      ((await unknownUser.json()) as { message: string }).message,
    );
  });

  it("5 ta xato urinishdan keyin — 429", async () => {
    for (let i = 0; i < 5; i++)
      await post("/admin/auth/login", { username: "nobody", password: "x" });
    expect((await post("/admin/auth/login", { username: "nobody", password: "x" })).status).toBe(
      429,
    );
  });

  it("noto'g'ri 2FA kodi — 401", async () => {
    const step1 = await post("/admin/auth/login", { username: "root", password: "yaqin-demo" });
    const { challengeToken } = (await step1.json()) as { challengeToken: string };
    expect((await post("/admin/auth/2fa", { challengeToken, code: "000000" })).status).toBe(401);
  });

  it("mijoz sessiyasi admin API'ga kirita olmaydi", async () => {
    const response = await mockFetch(
      new Request(`${BASE}/admin/businesses`, { headers: { cookie: "sessionid=abc" } }),
    );
    expect(response.status).toBe(401);
  });
});

describe("ruxsatlar (ADR-0009)", () => {
  it("moderator ko'ra oladi, lekin tahrirlay olmaydi", async () => {
    const moderator = await adminLogin("moderator");
    expect((await call("/admin/businesses", moderator)).status).toBe(200);
    const create = await call("/admin/businesses", moderator, {
      method: "POST",
      body: JSON.stringify({
        name: "X biznes",
        categorySlug: "sartaroshxonalar",
        districtSlug: "chilonzor",
      }),
    });
    expect(create.status).toBe(403);
  });

  it("CSRF tokensiz o'zgartirish — 403", async () => {
    const session = await adminLogin();
    const response = await mockFetch(
      new Request(`${BASE}/admin/businesses`, {
        method: "POST",
        headers: { cookie: session.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          name: "X",
          categorySlug: "sartaroshxonalar",
          districtSlug: "chilonzor",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });
});

describe("bizneslar", () => {
  it("qoralama → e'lon qilish talablari → saytda paydo bo'ladi", async () => {
    const session = await adminLogin();
    const draft = await createDraft(session, "Yangi demo sartarosh");
    expect(draft.status).toBe("draft");
    expect(draft.slug).toBe("yangi-demo-sartarosh");

    const tooEarly = await call(`/admin/businesses/${draft.id}`, session, {
      method: "PATCH",
      body: JSON.stringify({ status: "published" }),
    });
    expect(tooEarly.status).toBe(400);
    const { fields } = (await tooEarly.json()) as { fields: Record<string, string[]> };
    expect(Object.keys(fields).sort()).toEqual(["address", "consent", "location"]);

    const ready = await call(`/admin/businesses/${draft.id}`, session, {
      method: "PATCH",
      body: JSON.stringify({
        location: { lat: 41.28, lng: 69.21 },
        address: { text: "Chilonzor, 9-kvartal", landmark: null },
        consent: { givenBy: "Egasi Aziz aka", givenAt: new Date().toISOString(), note: null },
        phones: [{ number: "+998000000999", label: null }],
      }),
    });
    expect(ready.status).toBe(200);
    const published = await call(`/admin/businesses/${draft.id}`, session, {
      method: "PATCH",
      body: JSON.stringify({ status: "published" }),
    });
    expect(published.status).toBe(200);
    expect(published.headers.get(REVALIDATE_HEADER)).toContain(`business:${draft.slug}`);

    const publicList = (await (
      await mockFetch(
        new Request(`${BASE}/businesses?q=${encodeURIComponent("Yangi demo sartarosh")}`),
      )
    ).json()) as BusinessPage;
    expect(publicList.items.map((b) => b.id)).toContain(draft.id);
  });

  it("qoralama ommaviy saytda ko'rinmaydi", async () => {
    const session = await adminLogin();
    const draft = await createDraft(session);
    const response = await mockFetch(new Request(`${BASE}/businesses/${draft.slug}`));
    expect(response.status).toBe(404);
  });

  it("validatsiya: telefon formati, telegram nomi, ish vaqti", async () => {
    const session = await adminLogin();
    const draft = await createDraft(session);
    const response = await call(`/admin/businesses/${draft.id}`, session, {
      method: "PATCH",
      body: JSON.stringify({
        phones: [{ number: "90 123 45 67" }],
        telegram: "a b",
        schedule: { is24x7: false, days: [{ weekday: 9, intervals: [] }] },
      }),
    });
    expect(response.status).toBe(400);
    const { fields } = (await response.json()) as { fields: Record<string, string[]> };
    expect(Object.keys(fields).sort()).toEqual(["phones", "schedule", "telegram"]);
  });

  it("har bir o'zgarish audit jurnaliga yoziladi", async () => {
    const session = await adminLogin();
    const before = demoState.audit.length;
    const draft = await createDraft(session);
    await call(`/admin/businesses/${draft.id}`, session, {
      method: "PATCH",
      body: JSON.stringify({ description: "Yangi tavsif" }),
    });
    expect(demoState.audit.length).toBe(before + 2);
    expect(demoState.audit.at(-1)?.action).toBe("business.update");
  });
});

describe("rasmlar va katalog", () => {
  it("rasm yuklash, turini tekshirish, media orqali olish, o'chirish", async () => {
    const session = await adminLogin();
    const draft = await createDraft(session);
    const upload = (file: Blob) => {
      const form = new FormData();
      form.set("file", file, "photo");
      form.set("width", "800");
      form.set("height", "600");
      return call(`/admin/businesses/${draft.id}/photos`, session, { method: "POST", body: form });
    };

    expect((await upload(new Blob(["<svg/>"], { type: "image/svg+xml" }))).status).toBe(400);

    const ok = await upload(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));
    expect(ok.status).toBe(201);
    const photo = (await ok.json()) as AdminPhoto;
    expect(photo.width).toBe(800);

    const media = await mockFetch(new Request(`http://demo.test${photo.url}`));
    expect(media.headers.get("content-type")).toBe("image/jpeg");
    expect(media.headers.get("x-content-type-options")).toBe("nosniff");

    expect(
      (
        await call(`/admin/businesses/${draft.id}/photos/${photo.id}`, session, {
          method: "DELETE",
        })
      ).status,
    ).toBe(204);
  });

  it("katalog: qo'shish, validatsiya, yangilash, o'chirish", async () => {
    const session = await adminLogin();
    const draft = await createDraft(session);
    const path = `/admin/businesses/${draft.id}/items`;
    const valid = {
      kind: "service",
      name: "Soch olish",
      group: "Soch",
      description: null,
      price: { type: "fixed", min: { amount: 5_000_000, currency: "UZS" }, max: null },
      durationMinutes: 30,
      attributes: [],
      isAvailable: true,
    };

    const bad = await call(path, session, {
      method: "POST",
      body: JSON.stringify({
        ...valid,
        price: {
          type: "range",
          min: { amount: 100, currency: "UZS" },
          max: { amount: 50, currency: "UZS" },
        },
      }),
    });
    expect(bad.status).toBe(400);

    const created = (await (
      await call(path, session, { method: "POST", body: JSON.stringify(valid) })
    ).json()) as Item;
    expect(created.slug).toBe("soch-olish");

    const updated = await call(`${path}/${created.id}`, session, {
      method: "PUT",
      body: JSON.stringify({ ...valid, isAvailable: false }),
    });
    expect(((await updated.json()) as Item).isAvailable).toBe(false);

    expect((await call(`${path}/${created.id}`, session, { method: "DELETE" })).status).toBe(204);
    expect(await (await call(path, session)).json()).toEqual([]);
  });
});
