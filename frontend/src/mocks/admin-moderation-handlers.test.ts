// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { describe, expect, it } from "vitest";
import type {
  AdminBusiness,
  AdminBusinessRequest,
  AdminCategory,
  AdminComplaint,
  AdminReview,
  AdminUser,
  CategoryDetail,
  Complaint,
  Me,
  MyReview,
  ReviewPage,
} from "@/lib/api/types";
import { REVALIDATE_HEADER } from "./admin-common";
import { mockFetch } from "./fetch";
import { BUSINESSES } from "./fixtures/businesses";

const BASE = "http://demo.test/api/v1";
type Session = { cookie: string; csrf: string };
type Page<T> = { items: T[]; total: number };

function cookieValue(cookies: string[], name: string) {
  return (
    cookies
      .find((c) => c.startsWith(`${name}=`))
      ?.split(";")[0]
      ?.split("=")[1] ?? ""
  );
}

function call(path: string, session: Session | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (session) headers.set("cookie", session.cookie);
  if (session && init.method && init.method !== "GET") headers.set("x-csrftoken", session.csrf);
  if (typeof init.body === "string") headers.set("content-type", "application/json");
  return mockFetch(new Request(`${BASE}${path}`, { ...init, headers }));
}

const send = (method: string, path: string, session: Session | null, body?: unknown) =>
  call(path, session, { method, body: body === undefined ? undefined : JSON.stringify(body) });

async function adminLogin(username = "root"): Promise<Session> {
  const step1 = await send("POST", "/admin/auth/login", null, { username, password: "yaqin-demo" });
  const { challengeToken } = (await step1.json()) as { challengeToken: string };
  const step2 = await send("POST", "/admin/auth/2fa", null, { challengeToken, code: "123456" });
  const cookies = step2.headers.getSetCookie();
  return {
    cookie: `adminsessionid=${cookieValue(cookies, "adminsessionid")}; csrftoken=${cookieValue(cookies, "csrftoken")}`,
    csrf: cookieValue(cookies, "csrftoken"),
  };
}

async function userLogin(): Promise<Session & { user: Me }> {
  const response = await mockFetch(new Request(`${BASE}/auth/demo`, { method: "POST" }));
  const cookies = response.headers.getSetCookie();
  return {
    cookie: `sessionid=${cookieValue(cookies, "sessionid")}; csrftoken=${cookieValue(cookies, "csrftoken")}`,
    csrf: cookieValue(cookies, "csrftoken"),
    user: (await response.json()) as Me,
  };
}

async function json<T>(response: Response | Promise<Response>): Promise<T> {
  return (await (await response).json()) as T;
}

const uniqueSlug = () => `test-${crypto.randomUUID().slice(0, 8)}`;

describe("kategoriyalar", () => {
  it("ichki kategoriya qo'shiladi va ommaviy daraxtda ko'rinadi; slug band — 409", async () => {
    const root = await adminLogin();
    const categories = await json<AdminCategory[]>(call("/admin/categories", root));
    const parent = categories.find((c) => c.slug === "dokonlar")!;
    const slug = uniqueSlug();
    const created = await send("POST", "/admin/categories", root, {
      slug,
      name: { uz: "Soatlar", ru: "Часы" },
      parentId: parent.id,
    });
    expect(created.status).toBe(201);
    const category = (await created.json()) as AdminCategory;
    expect(category.iconKey).toBe(parent.iconKey);
    expect(created.headers.get(REVALIDATE_HEADER)).toContain("categories");

    const tree = await json<Array<{ slug: string; children: Array<{ slug: string }> }>>(
      call("/categories", null),
    );
    expect(tree.find((c) => c.slug === "dokonlar")?.children.map((c) => c.slug)).toContain(slug);

    const duplicate = await send("POST", "/admin/categories", root, {
      slug,
      name: { uz: "Takror", ru: "Повтор" },
      parentId: parent.id,
    });
    expect(duplicate.status).toBe(409);
  });

  it("uch daraja mumkin emas; yuqori darajaga ikonka majburiy", async () => {
    const root = await adminLogin();
    const categories = await json<AdminCategory[]>(call("/admin/categories", root));
    const leaf = categories.find((c) => c.slug === "kafelar")!;
    const nested = await send("POST", "/admin/categories", root, {
      slug: uniqueSlug(),
      name: { uz: "Ichki", ru: "Вложенная" },
      parentId: leaf.id,
    });
    expect(nested.status).toBe(400);
    const noIcon = await send("POST", "/admin/categories", root, {
      slug: uniqueSlug(),
      name: { uz: "Yangi yoʻnalish", ru: "Новое направление" },
      parentId: null,
    });
    expect(noIcon.status).toBe(400);
    expect(
      ((await noIcon.json()) as { fields: Record<string, string[]> }).fields.iconKey,
    ).toBeDefined();
  });

  it("bizneslari bor yoki ichki kategoriyali kategoriyani o'chirib bo'lmaydi", async () => {
    const root = await adminLogin();
    const categories = await json<AdminCategory[]>(call("/admin/categories", root));
    const withBusinesses = categories.find((c) => c.slug === "sartaroshxonalar")!;
    const withChildren = categories.find((c) => c.slug === "avto")!;
    expect((await send("DELETE", `/admin/categories/${withBusinesses.id}`, root)).status).toBe(409);
    expect((await send("DELETE", `/admin/categories/${withChildren.id}`, root)).status).toBe(409);
  });

  it("atributlar: tekshiruv va ommaviy kategoriyada mahalliylashtirilgan ko'rinish", async () => {
    const root = await adminLogin();
    const categories = await json<AdminCategory[]>(call("/admin/categories", root));
    const leaf = categories.find((c) => c.slug === "poyabzal")!;
    const path = `/admin/categories/${leaf.id}/attributes`;

    const bad = await send("PUT", path, root, {
      attributes: [
        { key: "size", name: { uz: "Oʻlcham", ru: "Размер" }, type: "select", options: [] },
      ],
    });
    expect(bad.status).toBe(400);

    const ok = await send("PUT", path, root, {
      attributes: [
        {
          key: "size",
          name: { uz: "Oʻlcham", ru: "Размер" },
          type: "select",
          unit: "sm",
          options: [
            { value: "40", label: { uz: "40", ru: "40" } },
            { value: "41", label: { uz: "41", ru: "41" } },
          ],
          filterable: true,
        },
      ],
    });
    expect(ok.status).toBe(200);
    // unit faqat number uchun
    expect(((await ok.json()) as AdminCategory).attributes[0]?.unit).toBeNull();

    const detail = await json<CategoryDetail>(call("/categories/poyabzal?lang=ru", null));
    expect(detail.attributes[0]).toMatchObject({ key: "size", name: "Размер", type: "select" });
  });

  it("moderatorda category.manage yo'q — 403", async () => {
    const moderator = await adminLogin("moderator");
    expect((await call("/admin/categories", moderator)).status).toBe(403);
  });
});

describe("sharhlar moderatsiyasi", () => {
  const business = BUSINESSES[1]!;

  it("rad etish sababsiz — 400; chop etilgan sharh biznes sahifasi va reytingga qo'shiladi", async () => {
    const user = await userLogin();
    const created = await send("POST", `/businesses/${business.slug}/reviews`, user, {
      rating: 5,
      text: "Ajoyib joy",
    });
    const review = (await created.json()) as MyReview;
    const before = await json<ReviewPage>(call(`/businesses/${business.slug}/reviews`, null));

    const moderator = await adminLogin("moderator");
    const queue = await json<Page<AdminReview>>(call("/admin/reviews?status=pending", moderator));
    expect(queue.items.some((r) => r.id === review.id)).toBe(true);
    // Navbat — eng eskisi birinchi
    const dates = queue.items.map((r) => r.createdAt);
    expect([...dates].sort()).toEqual(dates);

    const path = `/admin/reviews/${review.id}`;
    expect((await send("PATCH", path, moderator, { status: "rejected" })).status).toBe(400);
    const published = await send("PATCH", path, moderator, { status: "published" });
    expect(published.status).toBe(200);
    expect(published.headers.get(REVALIDATE_HEADER)).toContain(`reviews:${business.slug}`);

    const after = await json<ReviewPage>(call(`/businesses/${business.slug}/reviews`, null));
    expect(after.total).toBe(before.total + 1);
    expect(after.items[0]?.text).toBe("Ajoyib joy");
    expect(after.items[0]?.authorName).toBe("Demo F.");
  });

  it("rad etilgan sharh sababi muallifga ko'rinadi", async () => {
    const user = await userLogin();
    const created = await send("POST", `/businesses/${BUSINESSES[2]!.slug}/reviews`, user, {
      rating: 1,
      text: "Spam havola",
    });
    const review = (await created.json()) as MyReview;
    const moderator = await adminLogin("moderator");
    await send("PATCH", `/admin/reviews/${review.id}`, moderator, {
      status: "rejected",
      rejectionReason: "Reklama",
    });
    const mine = await json<MyReview[]>(call("/me/reviews", user));
    expect(mine[0]).toMatchObject({ status: "rejected", rejectionReason: "Reklama" });
  });
});

describe("shikoyatlar", () => {
  it("hal qilish javobsiz — 400; javob foydalanuvchiga ko'rinadi", async () => {
    const user = await userLogin();
    const created = await send("POST", "/complaints", user, {
      businessId: BUSINESSES[3]!.id,
      reason: "wrong_info",
      text: "Telefon eskirgan",
    });
    const complaint = (await created.json()) as Complaint;

    const moderator = await adminLogin("moderator");
    const open = await json<Page<AdminComplaint>>(call("/admin/complaints?status=open", moderator));
    expect(open.items.find((c) => c.id === complaint.id)?.reporter.id).toBe(user.user.id);

    const path = `/admin/complaints/${complaint.id}`;
    expect((await send("PATCH", path, moderator, { status: "resolved" })).status).toBe(400);
    expect((await send("PATCH", path, moderator, { status: "in_review" })).status).toBe(200);
    await send("PATCH", path, moderator, { status: "resolved", resolutionNote: "Yangilandi" });

    const mine = await json<Complaint[]>(call("/me/complaints", user));
    expect(mine[0]).toMatchObject({ status: "resolved", resolutionNote: "Yangilandi" });
  });
});

describe("biznes so'rovlari", () => {
  const input = {
    businessName: "Test ustaxona",
    activity: "Poyabzal taʼmiri",
    districtSlug: "chilonzor",
    address: "Demo koʻchasi, 1",
    contactName: "Anvar",
    phone: "90 000 00 01",
    note: null,
    agree: true,
  };

  it("ommaviy so'rov: rozilik majburiy, raqam E.164 ga keltiriladi", async () => {
    expect(
      (await send("POST", "/business-requests", null, { ...input, agree: false })).status,
    ).toBe(400);
    const created = await send("POST", "/business-requests", null, input);
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as { id: string };

    const root = await adminLogin();
    const list = await json<Page<AdminBusinessRequest>>(
      call("/admin/business-requests?status=new", root),
    );
    expect(list.items.find((r) => r.id === id)?.phone).toBe("+998900000001");
  });

  it("so'rovdan qoralama: manzil va telefon ko'chiriladi, qayta yaratish — 409", async () => {
    const { id } = await json<{ id: string }>(send("POST", "/business-requests", null, input));
    const root = await adminLogin();
    const body = { name: "Test ustaxona", categorySlug: "atelye", districtSlug: "chilonzor" };
    const converted = await send("POST", `/admin/business-requests/${id}/convert`, root, body);
    expect(converted.status).toBe(201);
    const business = (await converted.json()) as AdminBusiness;
    expect(business).toMatchObject({ status: "draft", address: { text: "Demo koʻchasi, 1" } });
    expect(business.phones[0]?.number).toBe("+998900000001");

    expect((await send("POST", `/admin/business-requests/${id}/convert`, root, body)).status).toBe(
      409,
    );
    expect(
      (await send("PATCH", `/admin/business-requests/${id}`, root, { status: "new" })).status,
    ).toBe(409);
  });

  it("rad etishda izoh majburiy; moderator so'rovlarni (telefonlarni) ko'rmaydi", async () => {
    const { id } = await json<{ id: string }>(send("POST", "/business-requests", null, input));
    const root = await adminLogin();
    const path = `/admin/business-requests/${id}`;
    expect((await send("PATCH", path, root, { status: "rejected" })).status).toBe(400);
    const rejected = await send("PATCH", path, root, {
      status: "rejected",
      adminNote: "Toshkentdan tashqarida",
    });
    expect(((await rejected.json()) as AdminBusinessRequest).status).toBe("rejected");

    const moderator = await adminLogin("moderator");
    expect((await call("/admin/business-requests", moderator)).status).toBe(403);
  });
});

describe("foydalanuvchilar", () => {
  it("bloklash: sessiya tugaydi; moderator ko'radi, lekin bloklay olmaydi", async () => {
    const user = await userLogin();
    const moderator = await adminLogin("moderator");
    const list = await json<Page<AdminUser>>(call("/admin/users?q=demo", moderator));
    expect(list.items.some((u) => u.id === user.user.id)).toBe(true);
    expect(JSON.stringify(list)).not.toContain("sessionid");

    const path = `/admin/users/${user.user.id}`;
    expect(
      (await send("PATCH", path, moderator, { isBlocked: true, blockedReason: "Spam" })).status,
    ).toBe(403);

    const root = await adminLogin();
    expect((await send("PATCH", path, root, { isBlocked: true })).status).toBe(400);
    const blocked = await send("PATCH", path, root, { isBlocked: true, blockedReason: "Spam" });
    expect(((await blocked.json()) as AdminUser).isBlocked).toBe(true);
    expect((await call("/me", user)).status).toBe(401);

    const blockedList = await json<Page<AdminUser>>(call("/admin/users?blocked=true", root));
    expect(blockedList.items.map((u) => u.id)).toContain(user.user.id);

    await send("PATCH", path, root, { isBlocked: false });
    const unblocked = await json<Page<AdminUser>>(call("/admin/users?blocked=true", root));
    expect(unblocked.items.map((u) => u.id)).not.toContain(user.user.id);
  });
});
