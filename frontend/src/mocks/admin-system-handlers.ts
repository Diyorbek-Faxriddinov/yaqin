import { http, HttpResponse } from "msw";
import type {
  AdminPermission,
  AdminRole,
  AdminStaff,
  AuditEntry as ApiAuditEntry,
  AuditTargetType,
  EffectivePermission,
  PlatformSettings,
  ReportLinkStatus,
} from "@/lib/api/types";
import {
  API,
  audit,
  authorize,
  districtRef,
  error,
  invalid,
  langOf,
  paginate,
  randomToken,
  readJson,
  revalidate,
  text,
  type Fields,
} from "./admin-common";
import { categoryRef } from "./db";
import {
  ALL_PERMISSIONS,
  demoState,
  findBusinessRecord,
  findCategory,
  permissionsOf,
  publicBusinesses,
  type DemoAdmin,
  type DemoRole,
} from "./demo-state";
import {
  businessTotals,
  EVENT_KEYS,
  lastDays,
  parseDays,
  recordEvent,
  statsSeries,
  type StatsEventType,
} from "./stats";

/**
 * Administratorlar va rollar (ADR-0009): ko'rish — staff.manage, o'zgartirish — faqat Root;
 * Root'ning o'zi API orqali o'zgarmaydi. Audit (audit.view), sozlamalar (settings.manage),
 * statistika (stats.view) va egasi uchun hisobot havolasi (ADR-0007).
 */

const USERNAME = /^[a-z][a-z0-9_.-]{2,31}$/;
const AUDIT_TARGETS = new Set<AuditTargetType>([
  "auth",
  "business",
  "item",
  "photo",
  "review",
  "complaint",
  "category",
  "request",
  "user",
  "admin",
  "role",
  "settings",
  "report",
]);
const TELEGRAM = /^[A-Za-z0-9_]{5,32}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+998\d{9}$/;

function roleRef(role: DemoRole) {
  return { id: role.id, name: role.name };
}

function toRole(role: DemoRole): AdminRole {
  return {
    ...role,
    adminCount: demoState.admins.filter((a) => a.roleIds.includes(role.id)).length,
  };
}

/** Har bir amaldagi ruxsat va manbasi: qaysi rol(lar)dan yoki alohida berilgan */
function effectivePermissions(admin: DemoAdmin): EffectivePermission[] {
  const roles = demoState.roles.filter((r) => admin.roleIds.includes(r.id));
  return permissionsOf(admin).map((permission) => ({
    permission,
    sources: admin.isRoot
      ? []
      : [
          ...roles
            .filter((r) => r.permissions.includes(permission))
            .map((r) => ({ type: "role" as const, role: roleRef(r) })),
          ...(admin.extraPermissions.includes(permission) ? [{ type: "direct" as const }] : []),
        ],
  }));
}

function toStaff(admin: DemoAdmin): AdminStaff {
  return {
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    isRoot: admin.isRoot,
    isActive: admin.isActive,
    roles: demoState.roles.filter((r) => admin.roleIds.includes(r.id)).map(roleRef),
    extraPermissions: admin.extraPermissions,
    effectivePermissions: effectivePermissions(admin),
    lastLoginAt: admin.lastLoginAt,
    createdAt: admin.createdAt,
  };
}

function parsePermissions(value: unknown): AdminPermission[] | null {
  if (!Array.isArray(value)) return null;
  return value.every((p) => ALL_PERMISSIONS.includes(p as AdminPermission))
    ? ALL_PERMISSIONS.filter((p) => value.includes(p))
    : null;
}

function parseRoleIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.every((id) => demoState.roles.some((r) => r.id === id))
    ? [...new Set(value as string[])]
    : null;
}

function endSessions(adminId: string) {
  for (const [token, session] of demoState.adminSessions) {
    if (session.adminId === adminId) demoState.adminSessions.delete(token);
  }
}

function parseRoleInput(body: Record<string, unknown> | null) {
  const name = text(body?.name);
  const description = text(body?.description);
  const permissions = parsePermissions(body?.permissions);
  const fields: Fields = {};
  if (name.length < 2 || name.length > 40) fields.name = ["2–40 belgi"];
  if (description.length > 200) fields.description = ["Koʻpi bilan 200 belgi"];
  if (!permissions || permissions.length === 0) fields.permissions = ["Kamida bitta ruxsat"];
  return Object.keys(fields).length > 0 || !permissions
    ? { fields }
    : { value: { name, description: description || null, permissions } };
}

function parseSettings(body: Record<string, unknown> | null) {
  const contacts = (body?.contacts ?? {}) as Record<string, unknown>;
  const telegram = text(contacts.telegram).replace(/^@/, "");
  const email = text(contacts.email);
  const phone = text(contacts.phone);
  const fields: Fields = {};
  if (typeof body?.reviewsPremoderation !== "boolean")
    fields.reviewsPremoderation = ["Qiymat kerak"];
  if (typeof body?.businessRequestsOpen !== "boolean")
    fields.businessRequestsOpen = ["Qiymat kerak"];
  if (telegram && !TELEGRAM.test(telegram))
    fields["contacts.telegram"] = ["Foydalanuvchi nomi notoʻgʻri"];
  if (email && (!EMAIL.test(email) || email.length > 120))
    fields["contacts.email"] = ["Email notoʻgʻri"];
  if (phone && !PHONE.test(phone)) fields["contacts.phone"] = ["Raqam formati: +998XXXXXXXXX"];
  if (Object.keys(fields).length > 0) return { fields };
  const settings: PlatformSettings = {
    reviewsPremoderation: body?.reviewsPremoderation as boolean,
    businessRequestsOpen: body?.businessRequestsOpen as boolean,
    contacts: { telegram: telegram || null, email: email || null, phone: phone || null },
  };
  return { settings };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function linkStatus(businessId: string): ReportLinkStatus {
  const link = demoState.reportLinks.get(businessId);
  return link
    ? {
        active: true,
        createdAt: link.createdAt,
        lastViewedAt: link.lastViewedAt,
        viewCount: link.viewCount,
      }
    : { active: false, createdAt: null, lastViewedAt: null, viewCount: 0 };
}

const inPeriod = (iso: string, from: string) => iso.slice(0, 10) >= from;

export const adminSystemHandlers = [
  // --- Ommaviy ---
  http.post(`${API}/events`, async ({ request }) => {
    const body = await readJson(request);
    const type = body?.type as StatsEventType;
    const businessId = typeof body?.businessId === "string" ? body.businessId : "";
    if (!(type in EVENT_KEYS) || !publicBusinesses().some((b) => b.id === businessId)) {
      return error(400, "validation_error", "Hodisa notoʻgʻri");
    }
    recordEvent(type, businessId);
    return new HttpResponse(null, { status: 202 });
  }),

  http.get(`${API}/settings`, () =>
    HttpResponse.json({
      businessRequestsOpen: demoState.settings.businessRequestsOpen,
      contacts: demoState.settings.contacts,
    }),
  ),

  http.get(`${API}/reports/:token`, async ({ request, params }) => {
    const token = String(params.token);
    const notFound = () => error(404, "not_found", "Havola topilmadi yoki bekor qilingan");
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) return notFound();
    const hash = await sha256(token);
    const entry = [...demoState.reportLinks.entries()].find(([, link]) => link.tokenHash === hash);
    const business = entry ? findBusinessRecord(entry[0]) : undefined;
    if (!entry || !business) return notFound();
    entry[1].lastViewedAt = new Date().toISOString();
    entry[1].viewCount += 1;
    const lang = langOf(request);
    const category = findCategory(business.categorySlug);
    return HttpResponse.json(
      {
        ...statsSeries([business], 30),
        business: {
          name: business.name,
          categoryName: category ? categoryRef(category, lang).name : "",
          districtName: districtRef(business.districtSlug, lang).name,
          isPublished: business.status === "published",
        },
        generatedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } },
    );
  }),

  // --- Administratorlar ---
  http.get(`${API}/admin/staff`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "staff.manage");
    if ("response" in auth) return auth.response;
    return HttpResponse.json(demoState.admins.map(toStaff));
  }),

  http.post(`${API}/admin/staff`, async ({ request, cookies }) => {
    const auth = authorize(request, cookies, "root");
    if ("response" in auth) return auth.response;
    const body = await readJson(request);
    const username = text(body?.username).toLowerCase();
    const displayName = text(body?.displayName);
    const roleIds = parseRoleIds(body?.roleIds ?? []);
    const extraPermissions = parsePermissions(body?.extraPermissions ?? []);
    const fields: Fields = {};
    if (!USERNAME.test(username)) fields.username = ["Kichik lotin harflari, raqam, . _ - (3–32)"];
    if (displayName.length < 2 || displayName.length > 60) fields.displayName = ["2–60 belgi"];
    if (!roleIds) fields.roleIds = ["Rol topilmadi"];
    if (!extraPermissions) fields.extraPermissions = ["Ruxsat notoʻgʻri"];
    if (Object.keys(fields).length > 0 || !roleIds || !extraPermissions) return invalid(fields);
    if (demoState.admins.some((a) => a.username === username)) {
      return error(409, "username_taken", "Bu login band", { username: ["Bu login band"] });
    }
    const temporaryPassword = randomToken(14);
    const admin: DemoAdmin = {
      id: crypto.randomUUID(),
      username,
      password: temporaryPassword,
      totpCode: "123456",
      displayName,
      isRoot: false,
      isActive: true,
      roleIds,
      extraPermissions,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };
    demoState.admins.push(admin);
    audit(auth.admin, "admin.create", "admin", admin.id, `Qoʻshildi: ${username}`);
    return HttpResponse.json({ staff: toStaff(admin), temporaryPassword }, { status: 201 });
  }),

  http.patch(`${API}/admin/staff/:adminId`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "root");
    if ("response" in auth) return auth.response;
    const admin = demoState.admins.find((a) => a.id === params.adminId);
    if (!admin) return error(404, "not_found", "Topilmadi");
    if (admin.isRoot) return error(403, "root_immutable", "Root API orqali oʻzgartirilmaydi");
    const body = (await readJson(request)) ?? {};
    const fields: Fields = {};
    const displayName = "displayName" in body ? text(body.displayName) : admin.displayName;
    const roleIds = "roleIds" in body ? parseRoleIds(body.roleIds) : admin.roleIds;
    const extra =
      "extraPermissions" in body ? parsePermissions(body.extraPermissions) : admin.extraPermissions;
    if (displayName.length < 2 || displayName.length > 60) fields.displayName = ["2–60 belgi"];
    if (!roleIds) fields.roleIds = ["Rol topilmadi"];
    if (!extra) fields.extraPermissions = ["Ruxsat notoʻgʻri"];
    if ("isActive" in body && typeof body.isActive !== "boolean")
      fields.isActive = ["Qiymat kerak"];
    if (Object.keys(fields).length > 0 || !roleIds || !extra) return invalid(fields);

    const changes: string[] = [];
    if (displayName !== admin.displayName) changes.push("ism");
    if (roleIds.join() !== admin.roleIds.join()) changes.push("rollar");
    if (extra.join() !== admin.extraPermissions.join()) changes.push("alohida ruxsatlar");
    admin.displayName = displayName;
    admin.roleIds = roleIds;
    admin.extraPermissions = extra;
    if (typeof body.isActive === "boolean" && body.isActive !== admin.isActive) {
      admin.isActive = body.isActive;
      changes.push(body.isActive ? "faollashtirildi" : "oʻchirildi");
      if (!body.isActive) endSessions(admin.id);
    }
    audit(
      auth.admin,
      "admin.update",
      "admin",
      admin.id,
      `${admin.username}: ${changes.join(", ") || "oʻzgarishsiz"}`,
    );
    return HttpResponse.json(toStaff(admin));
  }),

  http.post(`${API}/admin/staff/:adminId/reset-password`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "root");
    if ("response" in auth) return auth.response;
    const admin = demoState.admins.find((a) => a.id === params.adminId);
    if (!admin) return error(404, "not_found", "Topilmadi");
    if (admin.isRoot) return error(403, "root_immutable", "Root API orqali oʻzgartirilmaydi");
    const temporaryPassword = randomToken(14);
    admin.password = temporaryPassword;
    endSessions(admin.id);
    audit(
      auth.admin,
      "admin.reset_password",
      "admin",
      admin.id,
      `Parol yangilandi: ${admin.username}`,
    );
    return HttpResponse.json({ temporaryPassword });
  }),

  // --- Rollar ---
  http.get(`${API}/admin/roles`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "staff.manage");
    if ("response" in auth) return auth.response;
    return HttpResponse.json(demoState.roles.map(toRole));
  }),

  http.post(`${API}/admin/roles`, async ({ request, cookies }) => {
    const auth = authorize(request, cookies, "root");
    if ("response" in auth) return auth.response;
    const parsed = parseRoleInput(await readJson(request));
    if (!parsed.value) return invalid(parsed.fields ?? {});
    const role: DemoRole = { id: crypto.randomUUID(), ...parsed.value, isBuiltIn: false };
    demoState.roles.push(role);
    audit(auth.admin, "role.create", "role", role.id, `Qoʻshildi: ${role.name}`);
    return HttpResponse.json(toRole(role), { status: 201 });
  }),

  http.patch(`${API}/admin/roles/:roleId`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "root");
    if ("response" in auth) return auth.response;
    const role = demoState.roles.find((r) => r.id === params.roleId);
    if (!role) return error(404, "not_found", "Topilmadi");
    const parsed = parseRoleInput(await readJson(request));
    if (!parsed.value) return invalid(parsed.fields ?? {});
    Object.assign(role, parsed.value);
    audit(
      auth.admin,
      "role.update",
      "role",
      role.id,
      `${role.name}: ${role.permissions.join(", ")}`,
    );
    return HttpResponse.json(toRole(role));
  }),

  http.delete(`${API}/admin/roles/:roleId`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "root");
    if ("response" in auth) return auth.response;
    const role = demoState.roles.find((r) => r.id === params.roleId);
    if (!role) return error(404, "not_found", "Topilmadi");
    if (role.isBuiltIn) return error(409, "built_in_role", "Tizim rolini oʻchirib boʻlmaydi");
    if (demoState.admins.some((a) => a.roleIds.includes(role.id))) {
      return error(409, "role_in_use", "Rol administratorlarga berilgan — avval olib tashlang");
    }
    demoState.roles.splice(demoState.roles.indexOf(role), 1);
    audit(auth.admin, "role.delete", "role", role.id, `Oʻchirildi: ${role.name}`);
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Audit (faqat o'qish) ---
  http.get(`${API}/admin/audit`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "audit.view");
    if ("response" in auth) return auth.response;
    const url = new URL(request.url);
    const targetType = url.searchParams.get("targetType") as AuditTargetType | null;
    const adminId = url.searchParams.get("adminId");
    const entries: ApiAuditEntry[] = demoState.audit
      .filter((e) => !targetType || !AUDIT_TARGETS.has(targetType) || e.targetType === targetType)
      .filter((e) => !adminId || e.adminId === adminId)
      .slice()
      .reverse()
      .map((e) => {
        const admin = demoState.admins.find((a) => a.id === e.adminId);
        return { ...e, admin: admin ? { id: admin.id, displayName: admin.displayName } : null };
      })
      .map(({ adminId: _adminId, ...entry }) => entry);
    return HttpResponse.json(paginate(request, entries));
  }),

  // --- Sozlamalar ---
  http.get(`${API}/admin/settings`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "settings.manage");
    if ("response" in auth) return auth.response;
    return HttpResponse.json(demoState.settings);
  }),

  http.put(`${API}/admin/settings`, async ({ request, cookies }) => {
    const auth = authorize(request, cookies, "settings.manage");
    if ("response" in auth) return auth.response;
    const parsed = parseSettings(await readJson(request));
    if (!parsed.settings) return invalid(parsed.fields ?? {});
    const before = demoState.settings;
    const changed = [
      before.reviewsPremoderation !== parsed.settings.reviewsPremoderation &&
        "sharhlar moderatsiyasi",
      before.businessRequestsOpen !== parsed.settings.businessRequestsOpen && "soʻrov formasi",
      JSON.stringify(before.contacts) !== JSON.stringify(parsed.settings.contacts) && "kontaktlar",
    ].filter(Boolean);
    demoState.settings = parsed.settings;
    audit(
      auth.admin,
      "settings.update",
      "settings",
      "platform",
      changed.join(", ") || "oʻzgarishsiz",
    );
    // Ommaviy sahifalar (Aloqa, so'rov formasi) keshdan o'qiydi
    return HttpResponse.json(demoState.settings, {
      headers: revalidate(new Headers(), "settings"),
    });
  }),

  // --- Statistika ---
  http.get(`${API}/admin/stats`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "stats.view");
    if ("response" in auth) return auth.response;
    const days = parseDays(request);
    const published = publicBusinesses();
    const series = statsSeries(published, days);
    const from = lastDays(days)[0] ?? "";
    const top = published
      .map((business) => ({ business, totals: businessTotals(business, days) }))
      .sort((a, b) => b.totals.profileViews - a.totals.profileViews)
      .slice(0, 10)
      .map(({ business, totals }) => ({
        business: { id: business.id, slug: business.slug, name: business.name },
        profileViews: totals.profileViews,
        contactClicks: totals.calls + totals.telegramClicks + totals.directionClicks,
      }));
    return HttpResponse.json({
      ...series,
      topBusinesses: top,
      content: {
        publishedBusinesses: published.length,
        newBusinesses: demoState.businesses.filter((b) => inPeriod(b.createdAt, from)).length,
        newReviews: demoState.reviews.filter((r) => inPeriod(r.createdAt, from)).length,
        newComplaints: demoState.complaints.filter((c) => inPeriod(c.createdAt, from)).length,
        newRequests: demoState.requests.filter((r) => inPeriod(r.createdAt, from)).length,
      },
    });
  }),

  http.get(`${API}/admin/businesses/:businessId/stats`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.view");
    if ("response" in auth) return auth.response;
    const business = findBusinessRecord(String(params.businessId));
    if (!business) return error(404, "not_found", "Topilmadi");
    return HttpResponse.json(statsSeries([business], parseDays(request)));
  }),

  // --- Egasi uchun hisobot havolasi ---
  http.get(`${API}/admin/businesses/:businessId/report-link`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.view");
    if ("response" in auth) return auth.response;
    const business = findBusinessRecord(String(params.businessId));
    if (!business) return error(404, "not_found", "Topilmadi");
    return HttpResponse.json(linkStatus(business.id));
  }),

  http.post(
    `${API}/admin/businesses/:businessId/report-link`,
    async ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.edit");
      if ("response" in auth) return auth.response;
      const business = findBusinessRecord(String(params.businessId));
      if (!business) return error(404, "not_found", "Topilmadi");
      // ~250 bit tasodifiylik; saqlanadi faqat xeshi — eski havola avtomatik bekor bo'ladi
      const token = randomToken(43);
      demoState.reportLinks.set(business.id, {
        tokenHash: await sha256(token),
        createdAt: new Date().toISOString(),
        lastViewedAt: null,
        viewCount: 0,
      });
      audit(
        auth.admin,
        "report.create",
        "report",
        business.id,
        `Hisobot havolasi: ${business.name}`,
      );
      return HttpResponse.json({ token, status: linkStatus(business.id) }, { status: 201 });
    },
  ),

  http.delete(`${API}/admin/businesses/:businessId/report-link`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.edit");
    if ("response" in auth) return auth.response;
    const business = findBusinessRecord(String(params.businessId));
    if (!business || !demoState.reportLinks.has(business.id))
      return error(404, "not_found", "Topilmadi");
    demoState.reportLinks.delete(business.id);
    audit(
      auth.admin,
      "report.revoke",
      "report",
      business.id,
      `Havola bekor qilindi: ${business.name}`,
    );
    return new HttpResponse(null, { status: 204 });
  }),
];
