// @vitest-environment node
// Mock API serverda (Node) ishlaydi — jsdom Blob/FormData Node Request bilan mos emas
import { describe, expect, it } from "vitest";
import type {
  AdminLoginChallenge,
  AdminMe,
  AdminRole,
  AdminStaff,
  AuditEntry,
  OwnerReport,
  PlatformSettings,
  PlatformStats,
  ReportLinkStatus,
  ReviewPage,
  StatsSeries,
} from "@/lib/api/types";
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

function send(method: string, path: string, session: Session | null, body?: unknown) {
  const headers = new Headers();
  if (session) headers.set("cookie", session.cookie);
  if (session && method !== "GET") headers.set("x-csrftoken", session.csrf);
  if (body !== undefined) headers.set("content-type", "application/json");
  return mockFetch(
    new Request(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

const get = (path: string, session: Session | null = null) => send("GET", path, session);

async function json<T>(response: Response | Promise<Response>): Promise<T> {
  return (await (await response).json()) as T;
}

const NEW_PASSWORD = "Kuzgi-Barglar-Shamol-77";

async function adminLogin(username = "root", password = "yaqin-demo"): Promise<Session> {
  const step1 = await send("POST", "/admin/auth/login", null, { username, password });
  expect(step1.status).toBe(200);
  const { challengeToken, next, mustChangePassword } = (await step1.json()) as AdminLoginChallenge;
  if (next === "setup") {
    // Yangi administrator: birinchi kirishda yangi parol va 2FA
    const setup = await send("POST", "/admin/auth/setup", null, {
      challengeToken,
      newPassword: mustChangePassword ? NEW_PASSWORD : null,
    });
    expect(setup.status).toBe(200);
  }
  const step2 = await send("POST", "/admin/auth/2fa", null, { challengeToken, code: "123456" });
  const cookies = step2.headers.getSetCookie();
  return {
    cookie: `adminsessionid=${cookieValue(cookies, "adminsessionid")}; csrftoken=${cookieValue(cookies, "csrftoken")}`,
    csrf: cookieValue(cookies, "csrftoken"),
  };
}

async function userLogin(): Promise<Session> {
  const response = await mockFetch(new Request(`${BASE}/auth/demo`, { method: "POST" }));
  const cookies = response.headers.getSetCookie();
  return {
    cookie: `sessionid=${cookieValue(cookies, "sessionid")}; csrftoken=${cookieValue(cookies, "csrftoken")}`,
    csrf: cookieValue(cookies, "csrftoken"),
  };
}

const uniqueName = () => `test_${crypto.randomUUID().slice(0, 8)}`;

describe("administratorlar va rollar", () => {
  it("amaldagi ruxsatlar manbasi bilan; moderatorda staff.manage yo'q", async () => {
    const root = await adminLogin();
    const staff = await json<AdminStaff[]>(get("/admin/staff", root));
    const moderator = staff.find((a) => a.username === "moderator")!;
    const sources = (permission: string) =>
      moderator.effectivePermissions.find((p) => p.permission === permission)?.sources;
    expect(sources("business.view")).toEqual([{ type: "direct" }]);
    expect(sources("review.moderate")?.[0]).toMatchObject({
      type: "role",
      role: { name: "Moderator" },
    });
    expect(JSON.stringify(staff)).not.toContain("yaqin-demo");

    expect((await get("/admin/staff", await adminLogin("moderator"))).status).toBe(403);
  });

  it("yangi administrator vaqtinchalik parol bilan kiradi va faqat rol ruxsatlariga ega", async () => {
    const root = await adminLogin();
    const roles = await json<AdminRole[]>(get("/admin/roles", root));
    const analyst = roles.find((r) => r.name === "Tahlilchi")!;
    const username = uniqueName();
    const created = await send("POST", "/admin/staff", root, {
      username,
      displayName: "Test tahlilchi",
      roleIds: [analyst.id],
      extraPermissions: [],
    });
    expect(created.status).toBe(201);
    const { staff, temporaryPassword } = (await created.json()) as {
      staff: AdminStaff;
      temporaryPassword: string;
    };
    expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);

    const session = await adminLogin(username, temporaryPassword);
    const me = await json<AdminMe>(get("/admin/me", session));
    expect(me.permissions).toEqual(expect.arrayContaining(["stats.view", "audit.view"]));
    expect((await get("/admin/stats", session)).status).toBe(200);
    expect((await get("/admin/staff", session)).status).toBe(403);

    // Takroriy login — 409; o'chirilgan administrator sessiyasi tugaydi va kira olmaydi
    expect(
      (
        await send("POST", "/admin/staff", root, {
          username,
          displayName: "Takror",
          roleIds: [],
          extraPermissions: [],
        })
      ).status,
    ).toBe(409);
    await send("PATCH", `/admin/staff/${staff.id}`, root, { isActive: false });
    expect((await get("/admin/me", session)).status).toBe(401);
    expect(
      (await send("POST", "/admin/auth/login", null, { username, password: NEW_PASSWORD })).status,
    ).toBe(401);
  });

  it("Root API orqali o'zgarmaydi; Root bo'lmagan administrator administrator qo'sha olmaydi", async () => {
    const root = await adminLogin();
    const staff = await json<AdminStaff[]>(get("/admin/staff", root));
    const rootRecord = staff.find((a) => a.isRoot)!;
    expect(
      (await send("PATCH", `/admin/staff/${rootRecord.id}`, root, { isActive: false })).status,
    ).toBe(403);

    const moderator = await adminLogin("moderator");
    const attempt = await send("POST", "/admin/staff", moderator, {
      username: uniqueName(),
      displayName: "Hujum",
      roleIds: [],
      extraPermissions: ["staff.manage"],
    });
    expect(attempt.status).toBe(403);
  });

  it("rol o'zgarsa ruxsatlar darhol o'zgaradi; tizim yoki ishlatilayotgan rol o'chmaydi", async () => {
    const root = await adminLogin();
    const role = await json<AdminRole>(
      send("POST", "/admin/roles", root, {
        name: "Test rol",
        description: null,
        permissions: ["business.view"],
      }),
    );
    const username = uniqueName();
    const { staff, temporaryPassword } = await json<{
      staff: AdminStaff;
      temporaryPassword: string;
    }>(
      send("POST", "/admin/staff", root, {
        username,
        displayName: "Rol testi",
        roleIds: [role.id],
        extraPermissions: [],
      }),
    );
    const session = await adminLogin(username, temporaryPassword);
    expect((await get("/admin/audit", session)).status).toBe(403);

    await send("PATCH", `/admin/roles/${role.id}`, root, {
      name: "Test rol",
      description: null,
      permissions: ["business.view", "audit.view"],
    });
    expect((await get("/admin/audit", session)).status).toBe(200);

    expect((await send("DELETE", `/admin/roles/${role.id}`, root)).status).toBe(409);
    await send("PATCH", `/admin/staff/${staff.id}`, root, { roleIds: [] });
    expect((await send("DELETE", `/admin/roles/${role.id}`, root)).status).toBe(204);

    const builtIn = (await json<AdminRole[]>(get("/admin/roles", root))).find((r) => r.isBuiltIn)!;
    expect((await send("DELETE", `/admin/roles/${builtIn.id}`, root)).status).toBe(409);
  });
});

describe("audit jurnali", () => {
  it("harakatlar kim tomonidan yozilgani bilan, eng yangisi birinchi", async () => {
    const root = await adminLogin();
    await send("POST", "/admin/roles", root, {
      name: "Audit testi",
      description: null,
      permissions: ["business.view"],
    });
    const page = await json<Page<AuditEntry>>(get("/admin/audit?targetType=role", root));
    expect(page.items[0]).toMatchObject({
      action: "role.create",
      admin: { displayName: "Root (demo)" },
      summary: "Qoʻshildi: Audit testi",
    });
    const logins = await json<Page<AuditEntry>>(get("/admin/audit?targetType=auth", root));
    expect(logins.items[0]?.action).toBe("auth.login");
  });
});

describe("sozlamalar", () => {
  it("moderatsiyasiz rejimda sharh darhol chiqadi; so'rov formasi yopilsa — 403", async () => {
    const root = await adminLogin();
    const initial = await json<PlatformSettings>(get("/admin/settings", root));
    const save = (settings: PlatformSettings) => send("PUT", "/admin/settings", root, settings);

    expect(
      (await save({ ...initial, contacts: { ...initial.contacts, email: "notogri" } })).status,
    ).toBe(400);
    await save({
      reviewsPremoderation: false,
      businessRequestsOpen: false,
      contacts: { telegram: "@yaqin_uz", email: "info@example.com", phone: null },
    });
    expect(await json(get("/settings"))).toEqual({
      businessRequestsOpen: false,
      contacts: { telegram: "yaqin_uz", email: "info@example.com", phone: null },
    });

    const business = BUSINESSES[4]!;
    const user = await userLogin();
    const before = await json<ReviewPage>(get(`/businesses/${business.slug}/reviews`));
    const created = await send("POST", `/businesses/${business.slug}/reviews`, user, { rating: 4 });
    expect(((await created.json()) as { status: string }).status).toBe("published");
    expect((await json<ReviewPage>(get(`/businesses/${business.slug}/reviews`))).total).toBe(
      before.total + 1,
    );

    const request = await send("POST", "/business-requests", null, {
      businessName: "Yopiq forma",
      contactName: "Test",
      phone: "+998001110000",
      agree: true,
    });
    expect(request.status).toBe(403);

    await save(initial);
  });
});

describe("statistika va hisobot havolasi", () => {
  const business = BUSINESSES[5]!;

  it("saytdagi hodisa bugungi hisobga qo'shiladi; noto'g'ri hodisa — 400", async () => {
    const root = await adminLogin();
    const path = `/admin/businesses/${business.id}/stats?days=7`;
    const before = await json<StatsSeries>(get(path, root));
    expect(before.daily).toHaveLength(7);
    await send("POST", "/events", null, { type: "call_click", businessId: business.id });
    const after = await json<StatsSeries>(get(path, root));
    expect(after.totals.calls).toBe(before.totals.calls + 1);
    expect(after.daily.at(-1)!.calls).toBe(before.daily.at(-1)!.calls + 1);
    expect(
      (await send("POST", "/events", null, { type: "hack", businessId: business.id })).status,
    ).toBe(400);

    const platform = await json<PlatformStats>(get("/admin/stats?days=30", root));
    expect(platform.daily).toHaveLength(30);
    expect(platform.topBusinesses.length).toBeLessThanOrEqual(10);
    expect((await get("/admin/stats", await adminLogin("moderator"))).status).toBe(403);
  });

  it("havola: shaxsiy maʼlumotsiz hisobot, yangisi eskisini bekor qiladi, bekor qilingani — 404", async () => {
    const root = await adminLogin();
    const path = `/admin/businesses/${business.id}/report-link`;
    const first = await json<{ token: string }>(send("POST", path, root));
    const report = await get(`/reports/${first.token}`);
    expect(report.status).toBe(200);
    expect(report.headers.get("cache-control")).toBe("no-store");
    const body = (await report.json()) as OwnerReport;
    expect(body.business.name).toBe(business.name);
    expect(body.daily).toHaveLength(30);
    expect(JSON.stringify(body)).not.toContain("+998");
    expect((await json<ReportLinkStatus>(get(path, root))).viewCount).toBe(1);

    const second = await json<{ token: string }>(send("POST", path, root));
    expect((await get(`/reports/${first.token}`)).status).toBe(404);
    expect((await get(`/reports/${second.token}`)).status).toBe(200);

    expect((await send("DELETE", path, root)).status).toBe(204);
    expect((await get(`/reports/${second.token}`)).status).toBe(404);
    expect((await json<ReportLinkStatus>(get(path, root))).active).toBe(false);
  });
});
