// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { describe, expect, it } from "vitest";
import type {
  AdminBusiness,
  AdminItem,
  AdminLoginChallenge,
  AdminMe,
  AdminPhoto,
  AdminTotpSetup,
  ApiError,
  BusinessPage,
  Item,
} from "@/lib/api/types";
import { REVALIDATE_HEADER } from "./admin-common";
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

  it("5-noto'g'ri kod — challenge bekor bo'ladi (429)", async () => {
    const step1 = await post("/admin/auth/login", { username: "root", password: "yaqin-demo" });
    const { challengeToken } = (await step1.json()) as AdminLoginChallenge;
    for (let i = 0; i < 4; i++)
      expect((await post("/admin/auth/2fa", { challengeToken, code: "000000" })).status).toBe(401);
    expect((await post("/admin/auth/2fa", { challengeToken, code: "000000" })).status).toBe(429);
    expect((await post("/admin/auth/2fa", { challengeToken, code: "123456" })).status).toBe(401);
  });

  it("birinchi kirish: yangi parol + 2FA sozlash, keyin oddiy kirish", async () => {
    const admin = demoState.admins.find((a) => a.username === "moderator")!;
    const original = { ...admin };
    Object.assign(admin, {
      password: "vaqtinchalik-1",
      mustChangePassword: true,
      totpConfigured: false,
    });
    try {
      const step1 = await post("/admin/auth/login", {
        username: "moderator",
        password: "vaqtinchalik-1",
      });
      const challenge = (await step1.json()) as AdminLoginChallenge;
      expect(challenge).toMatchObject({ next: "setup", mustChangePassword: true });
      const { challengeToken } = challenge;
      // Sozlamasdan kod — yo'q; parolsiz va zaif parol — 400
      expect((await post("/admin/auth/2fa", { challengeToken, code: "123456" })).status).toBe(401);
      expect((await post("/admin/auth/setup", { challengeToken })).status).toBe(400);
      const weak = await post("/admin/auth/setup", { challengeToken, newPassword: "qisqa" });
      expect(((await weak.json()) as ApiError).fields?.newPassword).toBeDefined();

      const setup = await post("/admin/auth/setup", {
        challengeToken,
        newPassword: "Yangi-Uzun-Parol-2026",
      });
      expect(setup.status).toBe(200);
      const totp = (await setup.json()) as AdminTotpSetup;
      expect(totp.otpauthUri).toMatch(/^otpauth:\/\/totp\/Yaqin:moderator\?/);
      expect(totp.qrDataUri).toMatch(/^data:image\/svg\+xml;base64,/);
      // Kod tasdiqlanmaguncha parol o'zgarmaydi
      expect(admin.password).toBe("vaqtinchalik-1");
      expect((await post("/admin/auth/2fa", { challengeToken, code: "123456" })).status).toBe(200);

      // Keyingi kirish — faqat TOTP; sozlash endi kerak emas (409)
      const again = await post("/admin/auth/login", {
        username: "moderator",
        password: "Yangi-Uzun-Parol-2026",
      });
      const next = (await again.json()) as AdminLoginChallenge;
      expect(next.next).toBe("totp");
      const setupAgain = await post("/admin/auth/setup", { challengeToken: next.challengeToken });
      expect(setupAgain.status).toBe(409);
    } finally {
      Object.assign(admin, original);
    }
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

    // E'lon qilingandan keyin nom o'zgarsa ham sahifa manzili (slug) o'zgarmaydi
    const renamed = await call(`/admin/businesses/${draft.id}`, session, {
      method: "PATCH",
      body: JSON.stringify({ name: "Boshqa nom" }),
    });
    expect(((await renamed.json()) as AdminBusiness).slug).toBe(draft.slug);
  });

  it("qoralamada slug nom bilan birga o'zgaradi", async () => {
    const session = await adminLogin();
    const draft = await createDraft(session, "Eski qoralama nomi");
    const renamed = await call(`/admin/businesses/${draft.id}`, session, {
      method: "PATCH",
      body: JSON.stringify({ name: "Yangi qoralama nomi" }),
    });
    expect(((await renamed.json()) as AdminBusiness).slug).toBe("yangi-qoralama-nomi");
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

  it("hech qachon e'lon qilinmagan qoralama o'chiriladi; e'lon qilingani — 409", async () => {
    const session = await adminLogin();
    const draft = await createDraft(session, "Xato kiritilgan biznes");
    expect(draft.publishedAt).toBeNull();
    const removed = await call(`/admin/businesses/${draft.id}`, session, { method: "DELETE" });
    expect(removed.status).toBe(204);
    expect(demoState.audit.at(-1)?.action).toBe("business.delete");
    const gone = await call(`/admin/businesses/${draft.id}`, session);
    expect(gone.status).toBe(404);

    // Yashirilgan bo'lsa ham — bir marta e'lon qilingan
    const published = demoState.businesses.find((b) => b.publishedAt && b.status === "published");
    const refused = await call(`/admin/businesses/${String(published?.id)}`, session, {
      method: "DELETE",
    });
    expect(refused.status).toBe(409);
    expect(((await refused.json()) as ApiError).code).toBe("business_was_published");

    const moderator = await adminLogin("moderator");
    const other = await createDraft(session);
    const forbidden = await call(`/admin/businesses/${other.id}`, moderator, { method: "DELETE" });
    expect(forbidden.status).toBe(403);
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

describe("do'kon katalogi (ADR-0014)", () => {
  async function createShop(session: Session) {
    const response = await call("/admin/businesses", session, {
      method: "POST",
      body: JSON.stringify({
        name: `Doʻkon ${crypto.randomUUID().slice(0, 6)}`,
        categorySlug: "kiyim-kechak",
        districtSlug: "chilonzor",
      }),
    });
    return (await response.json()) as AdminBusiness;
  }
  const product = {
    kind: "product",
    name: "Futbolka",
    group: "Erkaklar",
    description: "100% paxta",
    price: { type: "fixed", min: { amount: 12_000_000, currency: "UZS" }, max: null },
    durationMinutes: null,
    attributes: [] as unknown[],
    isAvailable: true,
  };

  it("kategoriya xususiyatlari: tekshiruv, tilga moslash, tahrirlash qiymatlari", async () => {
    const session = await adminLogin();
    const shop = await createShop(session);
    const path = `/admin/businesses/${shop.id}/items`;
    const save = (attributes: unknown[], extra: object = {}) =>
      call(path, session, {
        method: "POST",
        body: JSON.stringify({ ...product, attributes, ...extra }),
      });

    const bad = await save([{ key: "size", name: "", value: "m,huge" }]);
    expect(((await bad.json()) as ApiError).fields?.attributes).toEqual([
      "Oʻlcham: qiymat notoʻgʻri",
    ]);
    const unknown = await save([{ key: "rangi", name: "", value: "qora" }]);
    expect(((await unknown.json()) as ApiError).fields?.attributes).toEqual([
      "Kategoriyada bunday xususiyat yoʻq",
    ]);
    const long = await save([], { description: "a".repeat(1001) });
    expect(((await long.json()) as ApiError).fields?.description).toEqual(["1000 belgigacha"]);

    const created = (await (
      await save([
        { key: "size", name: "", value: "l,s" },
        { key: "material", name: "", value: "cotton" },
        { key: null, name: "Rang", value: "Qora" },
      ])
    ).json()) as AdminItem;
    expect(created.description).toBe("100% paxta");
    expect(created.attributes).toEqual([
      { key: "size", name: "Oʻlcham", value: "S, L" },
      { key: "material", name: "Mato", value: "Paxta" },
      { key: "rang", name: "Rang", value: "Qora" },
    ]);
    expect(created.attributeValues).toEqual([
      { key: "size", name: "Oʻlcham", value: "s,l" },
      { key: "material", name: "Mato", value: "cotton" },
      { key: null, name: "Rang", value: "Qora" },
    ]);
    const ru = (await (await call(`${path}?lang=ru`, session)).json()) as AdminItem[];
    expect(ru[0]?.attributes.slice(0, 2)).toEqual([
      { key: "size", name: "Размер", value: "S, L" },
      { key: "material", name: "Материал", value: "Хлопок" },
    ]);
  });

  it("mahsulot rasmlari: yuklash, 5 ta chegara, tartib, o'chirish", async () => {
    const session = await adminLogin();
    const shop = await createShop(session);
    const created = (await (
      await call(`/admin/businesses/${shop.id}/items`, session, {
        method: "POST",
        body: JSON.stringify(product),
      })
    ).json()) as AdminItem;
    const path = `/admin/businesses/${shop.id}/items/${created.id}/photos`;
    const upload = () => {
      const form = new FormData();
      form.set("file", new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }), "p");
      return call(path, session, { method: "POST", body: form });
    };
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) ids.push(((await (await upload()).json()) as AdminPhoto).id);
    const limit = await upload();
    expect(limit.status).toBe(400);
    expect(((await limit.json()) as ApiError).fields?.file).toEqual(["Koʻpi bilan 5 ta rasm"]);

    const order = [ids[4]!, ...ids.slice(0, 4)];
    const reordered = await call(`${path}/order`, session, {
      method: "PUT",
      body: JSON.stringify({ photoIds: order }),
    });
    expect(reordered.status).toBe(204);
    const listed = (await (
      await call(`/admin/businesses/${shop.id}/items`, session)
    ).json()) as AdminItem[];
    expect(listed[0]?.photos.map((p) => p.id)).toEqual(order);
    expect(listed[0]?.images[0]?.url).toBe(`/api/v1/media/${ids[4]}`);

    expect((await call(`${path}/${ids[0]}`, session, { method: "DELETE" })).status).toBe(204);
    expect(demoState.media.has(ids[0]!)).toBe(false);
    // Mahsulot o'chirilsa — rasmlari ham
    await call(`/admin/businesses/${shop.id}/items/${created.id}`, session, { method: "DELETE" });
    expect(ids.some((id) => demoState.media.has(id))).toBe(false);
  });
});

describe("qulayliklar va veb-sayt (5.2a)", () => {
  it("tartib va takrorsiz saqlanadi; noto'g'ri qiymat — 400", async () => {
    const session = await adminLogin();
    const draft = await createDraft(session);
    const patch = (body: object) =>
      call(`/admin/businesses/${draft.id}`, session, {
        method: "PATCH",
        body: JSON.stringify(body),
      });

    const saved = (await (
      await patch({ website: "https://ustoz.uz", amenities: ["wifi", "card_payment", "wifi"] })
    ).json()) as AdminBusiness;
    expect(saved.website).toBe("https://ustoz.uz");
    expect(saved.amenities).toEqual(["card_payment", "wifi"]);

    const badSite = await patch({ website: "ustoz.uz" });
    expect(((await badSite.json()) as ApiError).fields?.website).toEqual([
      "Toʻliq manzil: https://...",
    ]);
    const badAmenity = await patch({ amenities: ["jacuzzi"] });
    expect(((await badAmenity.json()) as ApiError).fields?.amenities).toEqual([
      "Qulaylik notoʻgʻri",
    ]);
  });
});
