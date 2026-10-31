import { http, HttpResponse } from "msw";
import type { AdminBusiness, AdminBusinessListItem, Item, WeeklySchedule } from "@/lib/api/types";
import { isValidPoint } from "@/lib/geo";
import {
  API,
  audit,
  authorize,
  districtBySlug,
  districtRef,
  error,
  invalid,
  langOf,
  readJson,
  revalidate,
  slugify,
  toAdminMe,
  type Fields,
  type Lang,
} from "./admin-common";
import { categoryRef as publicCategoryRef } from "./db";
import {
  ADMIN_SESSION_COOKIE,
  CSRF_COOKIE,
  demoState,
  findBusinessRecord,
  findCategory,
  itemsOf,
  photosOf,
  type DemoBusinessRecord,
} from "./demo-state";

/**
 * Admin API demo handler'lari. Backend qoidalarini takrorlaydi: ikki bosqichli kirish,
 * har bir endpointda ruxsat tekshiruvi (ADR-0009), CSRF, audit jurnali.
 * Kesh yangilanishi: javobda `x-demo-revalidate` sarlavhasi — route handler uni o'qib
 * revalidateTag chaqiradi (productionda backend /api/revalidate webhook'ini chaqiradi).
 */

const SESSION_TTL = 8 * 60 * 60 * 1000;
const CHALLENGE_TTL = 5 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;
const LOGIN_BLOCK_MS = 60 * 1000;
// ⚠ Demo: hamma uchun bir xil kalit va QR o'rnida belgi; kod baribir "123456" (totpCode).
// Backendda — har bir admin uchun tasodifiy kalit va haqiqiy QR (apps/staff/totp.py)
const DEMO_TOTP_SECRET = "DEMODEMODEMODEMO";
const DEMO_QR =
  "data:image/svg+xml;base64," +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#fff"/><rect x="6" y="6" width="108" height="108" fill="none" stroke="#000" stroke-width="4" stroke-dasharray="8 6"/><text x="60" y="56" font-family="sans-serif" font-size="16" text-anchor="middle">DEMO</text><text x="60" y="76" font-family="sans-serif" font-size="11" text-anchor="middle">kod: 123456</text></svg>',
  );
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function cookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
  request: Request,
  httpOnly: boolean,
) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  // Admin sessiyasi — SameSite=Strict (boshqa saytdan kelgan havola bilan sessiya yuborilmaydi)
  return `${name}=${value}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Strict${httpOnly ? "; HttpOnly" : ""}${secure}`;
}

function uniqueSlug(base: string, exceptId?: string): string {
  let slug = base;
  for (let n = 2; demoState.businesses.some((b) => b.slug === slug && b.id !== exceptId); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

function categoryRef(slug: string, lang: Lang) {
  const category = findCategory(slug);
  if (!category) throw new Error(`Kategoriya yo'q: ${slug}`);
  return publicCategoryRef(category, lang);
}

/** Biznes faqat ichki (ota-kategoriyasi bor) kategoriyaga biriktiriladi */
function isLeafCategory(slug: string): boolean {
  return Boolean(findCategory(slug)?.parentSlug);
}

export function toAdminBusiness(record: DemoBusinessRecord, lang: Lang): AdminBusiness {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    category: categoryRef(record.categorySlug, lang),
    district: districtRef(record.districtSlug, lang),
    address: record.address,
    location: record.location,
    phones: record.phones,
    telegram: record.telegram,
    instagram: record.instagram,
    schedule: record.schedule,
    status: record.status,
    publishedAt: record.publishedAt,
    consent: record.consent,
    photos: photosOf(record.id),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toListItem(record: DemoBusinessRecord, lang: Lang): AdminBusinessListItem {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    category: categoryRef(record.categorySlug, lang),
    district: districtRef(record.districtSlug, lang),
    status: record.status,
    hasConsent: record.consent !== null,
    photosCount: photosOf(record.id).length,
    itemsCount: itemsOf(record).length,
    updatedAt: record.updatedAt,
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const CLOSE_TIME = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

function validSchedule(value: unknown): value is WeeklySchedule {
  if (!value || typeof value !== "object") return false;
  const schedule = value as WeeklySchedule;
  if (typeof schedule.is24x7 !== "boolean" || !Array.isArray(schedule.days)) return false;
  const weekdays = new Set<number>();
  return schedule.days.every((day) => {
    if (
      !Number.isInteger(day.weekday) ||
      day.weekday < 1 ||
      day.weekday > 7 ||
      weekdays.has(day.weekday)
    ) {
      return false;
    }
    weekdays.add(day.weekday);
    return (
      Array.isArray(day.intervals) &&
      day.intervals.length <= 4 &&
      day.intervals.every(
        (i) => TIME.test(i.open) && CLOSE_TIME.test(i.close) && i.open !== i.close,
      )
    );
  });
}

/** E'lon qilish uchun majburiy maydonlar (kontraktdagi PATCH tavsifiga mos) */
function publishProblems(record: DemoBusinessRecord): Fields {
  const fields: Fields = {};
  if (!record.location) fields.location = ["Xaritada joylashuvni belgilang"];
  if (!record.address.text.trim()) fields.address = ["Manzilni kiriting"];
  if (!record.consent) fields.consent = ["Egasining roziligini qayd eting"];
  return fields;
}

const findRecord = findBusinessRecord;

type BusinessCreate = { name: string; categorySlug: string; districtSlug: string };

/** POST /admin/businesses va so'rovdan yaratish (convert) uchun umumiy tekshiruv */
export function parseBusinessCreate(
  body: Record<string, unknown> | null,
): { value: BusinessCreate } | { fields: Fields } {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const categorySlug = typeof body?.categorySlug === "string" ? body.categorySlug : "";
  const districtSlug = typeof body?.districtSlug === "string" ? body.districtSlug : "";
  const fields: Fields = {};
  if (name.length < 2 || name.length > 120) fields.name = ["2–120 belgi"];
  if (!isLeafCategory(categorySlug)) fields.categorySlug = ["Ichki kategoriyani tanlang"];
  if (!districtBySlug.has(districtSlug)) fields.districtSlug = ["Tumanni tanlang"];
  return Object.keys(fields).length > 0
    ? { fields }
    : { value: { name, categorySlug, districtSlug } };
}

/** Platforma boshqaruvidagi qoralama (ADR-0007) */
export function createDraftBusiness(
  { name, categorySlug, districtSlug }: BusinessCreate,
  extra: Partial<Pick<DemoBusinessRecord, "address" | "phones">> = {},
): DemoBusinessRecord {
  const now = new Date().toISOString();
  const record: DemoBusinessRecord = {
    id: crypto.randomUUID(),
    slug: uniqueSlug(slugify(name)),
    name,
    categorySlug,
    districtSlug,
    location: null,
    priceRange: null,
    schedule: null,
    rating: { average: null, count: 0 },
    isVerified: true,
    createdAt: now,
    updatedAt: now,
    description: null,
    address: { text: "", landmark: null },
    phones: [],
    status: "draft",
    publishedAt: null,
    consent: null,
    telegram: null,
    instagram: null,
    ...extra,
  };
  demoState.businesses.push(record);
  demoState.items.set(record.id, []);
  return record;
}

const ITEM_PRICE_TYPES = new Set(["fixed", "from", "range", "on_request"]);

function parseItem(
  body: Record<string, unknown> | null,
): { item: Omit<Item, "id" | "slug" | "images"> } | { fields: Fields } {
  const fields: Fields = {};
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const kind = body?.kind === "product" || body?.kind === "service" ? body.kind : null;
  const price = body?.price as Item["price"] | undefined;
  const duration = body?.durationMinutes;
  if (name.length < 2 || name.length > 120) fields.name = ["2–120 belgi"];
  if (!kind) fields.kind = ["Turini tanlang"];
  if (!price || !ITEM_PRICE_TYPES.has(price.type)) {
    fields.price = ["Narx turini tanlang"];
  } else if (price.type !== "on_request") {
    if (!price.min || !Number.isInteger(price.min.amount) || price.min.amount <= 0)
      fields.price = ["Narxni kiriting"];
    if (price.type === "range" && (!price.max || price.max.amount <= (price.min?.amount ?? 0))) {
      fields.price = ["Yuqori chegara pastkisidan katta bo'lsin"];
    }
  }
  if (
    duration != null &&
    (!Number.isInteger(duration) || (duration as number) < 5 || (duration as number) > 1440)
  ) {
    fields.durationMinutes = ["5–1440 daqiqa"];
  }
  const attributes = Array.isArray(body?.attributes)
    ? (body.attributes as Array<{ name: string; value: string }>)
    : [];
  if (attributes.length > 20) fields.attributes = ["Ko'pi bilan 20 ta"];
  if (Object.keys(fields).length > 0 || !price || !kind) return { fields };

  return {
    item: {
      kind,
      name,
      group:
        typeof body?.group === "string" && body.group.trim()
          ? body.group.trim().slice(0, 60)
          : null,
      description:
        typeof body?.description === "string" && body.description.trim()
          ? body.description.trim().slice(0, 1000)
          : null,
      price: {
        type: price.type,
        min: price.type === "on_request" ? null : price.min,
        max: price.type === "range" ? price.max : null,
      },
      durationMinutes: kind === "service" && typeof duration === "number" ? duration : null,
      attributes: attributes
        .filter((a) => a.name?.trim() && a.value?.trim())
        .map((a) => ({
          key: slugify(a.name),
          name: a.name.trim().slice(0, 40),
          value: a.value.trim().slice(0, 120),
        })),
      isAvailable: body?.isAvailable !== false,
    },
  };
}

export const adminHandlers = [
  http.post(`${API}/admin/auth/login`, async ({ request }) => {
    const body = await readJson(request);
    const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const failures = demoState.loginFailures.get(username);
    if (failures && failures.blockedUntil > Date.now()) {
      return error(
        429,
        "too_many_attempts",
        "Juda ko'p urinish. Bir daqiqadan so'ng qayta urinib ko'ring.",
      );
    }
    const admin = demoState.admins.find((a) => a.username === username);
    // Login yoki parol — qaysi biri noto'g'riligini oshkor qilmaymiz
    // O'chirilgan administrator ham "noto'g'ri" — holati oshkor qilinmaydi
    if (!admin || !admin.isActive || admin.password !== password) {
      const count = (failures?.count ?? 0) + 1;
      demoState.loginFailures.set(username, {
        count: count >= MAX_LOGIN_FAILURES ? 0 : count,
        blockedUntil: count >= MAX_LOGIN_FAILURES ? Date.now() + LOGIN_BLOCK_MS : 0,
      });
      return error(401, "invalid_credentials", "Login yoki parol noto'g'ri");
    }
    demoState.loginFailures.delete(username);
    const challengeToken = crypto.randomUUID();
    const next = admin.mustChangePassword || !admin.totpConfigured ? "setup" : "totp";
    demoState.adminChallenges.set(challengeToken, {
      adminId: admin.id,
      next,
      pendingPassword: null,
      setupStarted: false,
      expiresAt: Date.now() + CHALLENGE_TTL,
      attempts: 0,
    });
    return HttpResponse.json({
      challengeToken,
      next,
      mustChangePassword: admin.mustChangePassword,
    });
  }),

  // Birinchi kirish: yangi parol (vaqtinchalik parol bo'lsa) va TOTP kaliti
  http.post(`${API}/admin/auth/setup`, async ({ request }) => {
    const body = await readJson(request);
    const token = typeof body?.challengeToken === "string" ? body.challengeToken : "";
    const challenge = demoState.adminChallenges.get(token);
    const admin = challenge && demoState.admins.find((a) => a.id === challenge.adminId);
    if (!challenge || challenge.expiresAt < Date.now() || !admin?.isActive) {
      demoState.adminChallenges.delete(token);
      return error(401, "challenge_expired", "Vaqt tugadi. Qaytadan kiring.");
    }
    if (challenge.next !== "setup") {
      return error(409, "setup_not_required", "2FA allaqachon sozlangan");
    }
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    if (admin.mustChangePassword && !newPassword) {
      return invalid({ newPassword: ["Yangi parolni kiriting"] });
    }
    if (newPassword) {
      // Backend qoidalari (Django validatorlari) — mock'da oddiy parollar ro'yxatisiz
      const problems: string[] = [];
      if (newPassword.length < 12) problems.push("Parol kamida 12 belgidan iborat boʻlishi kerak");
      if (/^d+$/.test(newPassword))
        problems.push("Parol faqat raqamlardan iborat boʻlmasligi kerak");
      if (newPassword.toLowerCase().includes(admin.username))
        problems.push("Parol login yoki ismga juda oʻxshash");
      if (newPassword === admin.password)
        problems.push("Yangi parol avvalgisidan farq qilishi kerak");
      if (problems.length > 0) return invalid({ newPassword: problems });
      challenge.pendingPassword = newPassword;
    }
    challenge.setupStarted = true;
    challenge.expiresAt = Date.now() + CHALLENGE_TTL;
    const uri = `otpauth://totp/Yaqin:${admin.username}?secret=${DEMO_TOTP_SECRET}&issuer=Yaqin`;
    return HttpResponse.json({ secret: DEMO_TOTP_SECRET, otpauthUri: uri, qrDataUri: DEMO_QR });
  }),

  http.post(`${API}/admin/auth/2fa`, async ({ request }) => {
    const body = await readJson(request);
    const token = typeof body?.challengeToken === "string" ? body.challengeToken : "";
    const code = typeof body?.code === "string" ? body.code : "";
    const challenge = demoState.adminChallenges.get(token);
    if (!challenge || challenge.expiresAt < Date.now()) {
      demoState.adminChallenges.delete(token);
      return error(401, "challenge_expired", "Vaqt tugadi. Qaytadan kiring.");
    }
    if (challenge.next === "setup" && !challenge.setupStarted) {
      return error(401, "setup_required", "Avval 2FA ni sozlang. Qaytadan kiring.");
    }
    const admin = demoState.admins.find((a) => a.id === challenge.adminId);
    if (!admin || code !== admin.totpCode) {
      challenge.attempts += 1;
      // 5-noto'g'ri kod — challenge bekor bo'ladi (backend bilan bir xil)
      if (challenge.attempts >= MAX_LOGIN_FAILURES) {
        demoState.adminChallenges.delete(token);
        return error(429, "too_many_attempts", "Juda ko'p urinish. Qaytadan kiring.");
      }
      return error(401, "invalid_code", "Kod noto'g'ri");
    }
    demoState.adminChallenges.delete(token);
    if (challenge.next === "setup") {
      if (challenge.pendingPassword) admin.password = challenge.pendingPassword;
      admin.mustChangePassword = false;
      admin.totpConfigured = true;
      audit(admin, "auth.setup", "auth", admin.id, "Parol va 2FA sozlandi");
    }
    const sessionToken = crypto.randomUUID();
    const csrfToken = crypto.randomUUID();
    demoState.adminSessions.set(sessionToken, {
      adminId: admin.id,
      csrfToken,
      expiresAt: Date.now() + SESSION_TTL,
    });
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      cookie(ADMIN_SESSION_COOKIE, sessionToken, SESSION_TTL / 1000, request, true),
    );
    headers.append(
      "Set-Cookie",
      cookie(CSRF_COOKIE, csrfToken, SESSION_TTL / 1000, request, false),
    );
    admin.lastLoginAt = new Date().toISOString();
    audit(admin, "auth.login", "auth", admin.id, `Kirdi: ${admin.username}`);
    return HttpResponse.json(toAdminMe(admin), { headers });
  }),

  http.post(`${API}/admin/auth/logout`, ({ cookies, request }) => {
    demoState.adminSessions.delete(cookies[ADMIN_SESSION_COOKIE] ?? "");
    const headers = new Headers();
    headers.append("Set-Cookie", cookie(ADMIN_SESSION_COOKIE, "", 0, request, true));
    return new HttpResponse(null, { status: 204, headers });
  }),

  http.get(`${API}/admin/me`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, null);
    if ("response" in auth) return auth.response;
    return HttpResponse.json(toAdminMe(auth.admin));
  }),

  http.get(`${API}/admin/businesses`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "business.view");
    if ("response" in auth) return auth.response;
    const url = new URL(request.url);
    const lang = langOf(request);
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const status = url.searchParams.get("status");
    const missingConsent = url.searchParams.get("missingConsent") === "true";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("pageSize") ?? 20) || 20),
    );

    const filtered = demoState.businesses
      .filter((b) => (q ? b.name.toLowerCase().includes(q) || b.slug.includes(q) : true))
      .filter((b) => (status ? b.status === status : true))
      .filter((b) => (missingConsent ? b.consent === null : true))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const start = (page - 1) * pageSize;
    return HttpResponse.json({
      items: filtered.slice(start, start + pageSize).map((b) => toListItem(b, lang)),
      total: filtered.length,
      page,
      pageSize,
    });
  }),

  http.post(`${API}/admin/businesses`, async ({ request, cookies }) => {
    const auth = authorize(request, cookies, "business.edit");
    if ("response" in auth) return auth.response;
    const parsed = parseBusinessCreate(await readJson(request));
    if ("fields" in parsed)
      return error(400, "validation_error", "Maʼlumotlar notoʻgʻri", parsed.fields);
    const record = createDraftBusiness(parsed.value);
    audit(auth.admin, "business.create", "business", record.id, `Yaratildi: ${record.name}`);
    return HttpResponse.json(toAdminBusiness(record, langOf(request)), { status: 201 });
  }),

  http.get(`${API}/admin/businesses/:businessId`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.view");
    if ("response" in auth) return auth.response;
    const record = findRecord(String(params.businessId));
    return record
      ? HttpResponse.json(toAdminBusiness(record, langOf(request)))
      : error(404, "not_found", "Topilmadi");
  }),

  http.patch(`${API}/admin/businesses/:businessId`, async ({ request, cookies, params }) => {
    const body = (await readJson(request)) ?? {};
    const changesStatus = "status" in body;
    const auth = authorize(request, cookies, changesStatus ? "business.publish" : "business.edit");
    if ("response" in auth) return auth.response;
    const record = findRecord(String(params.businessId));
    if (!record) return error(404, "not_found", "Topilmadi");

    const fields: Fields = {};
    const next: DemoBusinessRecord = { ...record };
    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (name.length < 2 || name.length > 120) fields.name = ["2–120 belgi"];
      else next.name = name;
    }
    if ("description" in body) {
      const text = typeof body.description === "string" ? body.description.trim() : "";
      if (text.length > 2000) fields.description = ["Ko'pi bilan 2000 belgi"];
      else next.description = text || null;
    }
    if ("categorySlug" in body) {
      const slug = String(body.categorySlug);
      if (!isLeafCategory(slug)) fields.categorySlug = ["Ichki kategoriyani tanlang"];
      else next.categorySlug = slug;
    }
    if ("districtSlug" in body) {
      const slug = String(body.districtSlug);
      if (!districtBySlug.has(slug)) fields.districtSlug = ["Tumanni tanlang"];
      else next.districtSlug = slug;
    }
    if ("address" in body) {
      const address = body.address as { text?: unknown; landmark?: unknown } | null;
      const text = typeof address?.text === "string" ? address.text.trim() : "";
      const landmark = typeof address?.landmark === "string" ? address.landmark.trim() : "";
      if (text.length > 300 || landmark.length > 200) fields.address = ["Juda uzun"];
      else next.address = { text, landmark: landmark || null };
    }
    if ("location" in body) {
      const location = body.location as { lat?: number; lng?: number } | null;
      if (location !== null && !isValidPoint(location ?? {}))
        fields.location = ["Koordinata noto'g'ri"];
      else
        next.location = location
          ? { lat: location.lat as number, lng: location.lng as number }
          : null;
    }
    if ("phones" in body) {
      const phones = Array.isArray(body.phones)
        ? (body.phones as Array<{ number?: string; label?: string | null }>)
        : [];
      if (phones.length > 5 || phones.some((p) => !/^\+998\d{9}$/.test(p.number ?? ""))) {
        fields.phones = ["Raqam formati: +998XXXXXXXXX"];
      } else {
        next.phones = phones.map((p) => ({
          number: p.number as string,
          label: p.label?.trim() || null,
        }));
      }
    }
    for (const key of ["telegram", "instagram"] as const) {
      if (key in body) {
        const value =
          typeof body[key] === "string" ? (body[key] as string).trim().replace(/^@/, "") : "";
        const pattern = key === "telegram" ? /^[A-Za-z0-9_]{5,32}$/ : /^[A-Za-z0-9_.]{1,30}$/;
        if (value && !pattern.test(value)) fields[key] = ["Foydalanuvchi nomi noto'g'ri"];
        else next[key] = value || null;
      }
    }
    if ("schedule" in body) {
      if (body.schedule !== null && !validSchedule(body.schedule))
        fields.schedule = ["Ish vaqti noto'g'ri"];
      else next.schedule = body.schedule as WeeklySchedule | null;
    }
    if ("consent" in body) {
      const consent = body.consent as {
        givenBy?: string;
        givenAt?: string;
        note?: string | null;
      } | null;
      if (consent === null) {
        next.consent = null;
      } else if (
        !consent.givenBy ||
        consent.givenBy.trim().length < 2 ||
        Number.isNaN(Date.parse(consent.givenAt ?? ""))
      ) {
        fields.consent = ["Kim va qachon rozilik berganini kiriting"];
      } else {
        next.consent = {
          givenBy: consent.givenBy.trim().slice(0, 100),
          givenAt: new Date(consent.givenAt as string).toISOString(),
          note: consent.note?.trim().slice(0, 500) || null,
        };
      }
    }
    if (changesStatus) {
      const status = body.status;
      if (status !== "draft" && status !== "published" && status !== "hidden") {
        fields.status = ["Holat noto'g'ri"];
      } else {
        if (status === "published") Object.assign(fields, publishProblems(next));
        next.status = status;
      }
    }
    if (Object.keys(fields).length > 0)
      return error(400, "validation_error", "Maʼlumotlar notoʻgʻri", fields);

    // Backend bilan bir xil: slug faqat hali e'lon qilinmagan biznesda nom bilan o'zgaradi
    if (next.name !== record.name && !record.publishedAt)
      next.slug = uniqueSlug(slugify(next.name), record.id);
    if (next.status === "published" && !next.publishedAt)
      next.publishedAt = new Date().toISOString();
    next.updatedAt = new Date().toISOString();
    Object.assign(record, next);
    audit(
      auth.admin,
      changesStatus ? `business.status.${next.status}` : "business.update",
      "business",
      record.id,
      `O'zgartirildi: ${Object.keys(body).join(", ")}`,
    );
    const headers = revalidate(
      new Headers(),
      "businesses",
      "categories",
      `business:${record.slug}`,
    );
    return HttpResponse.json(toAdminBusiness(record, langOf(request)), { headers });
  }),

  // Faqat hech qachon e'lon qilinmagan (xato kiritilgan qoralama) — backend bilan bir xil
  http.delete(`${API}/admin/businesses/:businessId`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.edit");
    if ("response" in auth) return auth.response;
    const record = findRecord(String(params.businessId));
    if (!record) return error(404, "not_found", "Topilmadi");
    if (record.publishedAt) {
      return error(
        409,
        "business_was_published",
        "Eʼlon qilingan biznes oʻchirilmaydi — uni yashiring",
      );
    }
    demoState.businesses = demoState.businesses.filter((b) => b.id !== record.id);
    for (const photo of photosOf(record.id)) demoState.media.delete(photo.id);
    demoState.photos.delete(record.id);
    demoState.items.delete(record.id);
    // So'rovdan yaratilgan bo'lsa — so'rov yana ishga qaytadi
    let reopened = false;
    for (const entry of demoState.requests) {
      if (entry.businessId === record.id && entry.status === "converted") {
        Object.assign(entry, {
          status: "contacted",
          businessId: null,
          updatedAt: new Date().toISOString(),
        });
        reopened = true;
      }
    }
    audit(
      auth.admin,
      "business.delete",
      "business",
      record.id,
      `Qoralama oʻchirildi: ${record.name}${reopened ? " (soʻrov qayta ochildi)" : ""}`,
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/admin/businesses/:businessId/photos`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.edit");
    if ("response" in auth) return auth.response;
    const record = findRecord(String(params.businessId));
    if (!record) return error(404, "not_found", "Topilmadi");
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return error(400, "validation_error", "Fayl topilmadi", { file: ["Rasm tanlang"] });
    }
    const file = form.get("file");
    if (!(file instanceof Blob))
      return error(400, "validation_error", "Fayl topilmadi", { file: ["Rasm tanlang"] });
    if (!PHOTO_TYPES.has(file.type)) {
      return error(400, "validation_error", "Faqat JPEG, PNG yoki WebP", {
        file: ["Fayl turi noto'g'ri"],
      });
    }
    if (file.size > MAX_PHOTO_BYTES) return error(413, "file_too_large", "Fayl 5 MB dan katta");
    const photos = photosOf(record.id);
    if (photos.length >= 12)
      return error(400, "validation_error", "Ko'pi bilan 12 ta rasm", { file: ["Limit"] });

    const id = crypto.randomUUID();
    demoState.media.set(id, {
      contentType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    const size = (key: string) => Math.max(1, Math.min(10000, Number(form.get(key)) || 1200));
    const alt =
      typeof form.get("alt") === "string" ? (form.get("alt") as string).slice(0, 200) : null;
    const photo = {
      id,
      url: `/api/v1/media/${id}`,
      width: size("width"),
      height: size("height"),
      alt: alt || null,
    };
    demoState.photos.set(record.id, [...photos, photo]);
    record.updatedAt = new Date().toISOString();
    audit(auth.admin, "photo.upload", "photo", id, `Rasm qo'shildi: ${record.name}`);
    const headers = revalidate(new Headers(), "businesses", `business:${record.slug}`);
    return HttpResponse.json(photo, { status: 201, headers });
  }),

  http.put(
    `${API}/admin/businesses/:businessId/photos/order`,
    async ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.edit");
      if ("response" in auth) return auth.response;
      const record = findRecord(String(params.businessId));
      if (!record) return error(404, "not_found", "Topilmadi");
      const body = await readJson(request);
      const ids = Array.isArray(body?.photoIds) ? (body.photoIds as string[]) : [];
      const photos = photosOf(record.id);
      if (ids.length !== photos.length || !photos.every((p) => ids.includes(p.id))) {
        return error(400, "validation_error", "Rasmlar ro'yxati mos emas");
      }
      demoState.photos.set(
        record.id,
        ids.map((id) => photos.find((p) => p.id === id)!),
      );
      audit(auth.admin, "photo.reorder", "business", record.id, "Rasmlar tartibi o'zgardi");
      return new HttpResponse(null, {
        status: 204,
        headers: revalidate(new Headers(), "businesses", `business:${record.slug}`),
      });
    },
  ),

  http.delete(
    `${API}/admin/businesses/:businessId/photos/:photoId`,
    ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.edit");
      if ("response" in auth) return auth.response;
      const record = findRecord(String(params.businessId));
      const photos = record ? photosOf(record.id) : [];
      if (!record || !photos.some((p) => p.id === params.photoId))
        return error(404, "not_found", "Topilmadi");
      demoState.photos.set(
        record.id,
        photos.filter((p) => p.id !== params.photoId),
      );
      demoState.media.delete(String(params.photoId));
      audit(
        auth.admin,
        "photo.delete",
        "photo",
        String(params.photoId),
        `Rasm o'chirildi: ${record.name}`,
      );
      return new HttpResponse(null, {
        status: 204,
        headers: revalidate(new Headers(), "businesses", `business:${record.slug}`),
      });
    },
  ),

  http.get(`${API}/admin/businesses/:businessId/items`, ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.view");
    if ("response" in auth) return auth.response;
    const record = findRecord(String(params.businessId));
    return record ? HttpResponse.json(itemsOf(record)) : error(404, "not_found", "Topilmadi");
  }),

  http.post(`${API}/admin/businesses/:businessId/items`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.edit");
    if ("response" in auth) return auth.response;
    const record = findRecord(String(params.businessId));
    if (!record) return error(404, "not_found", "Topilmadi");
    const parsed = parseItem(await readJson(request));
    if ("fields" in parsed)
      return error(400, "validation_error", "Maʼlumotlar notoʻgʻri", parsed.fields);
    const items = itemsOf(record);
    let slug = slugify(parsed.item.name);
    for (let n = 2; items.some((i) => i.slug === slug); n++)
      slug = `${slugify(parsed.item.name)}-${n}`;
    const item: Item = { ...parsed.item, id: crypto.randomUUID(), slug, images: [] };
    demoState.items.set(record.id, [...items, item]);
    audit(auth.admin, "item.create", "item", item.id, `${record.name}: ${item.name}`);
    return HttpResponse.json(item, {
      status: 201,
      headers: revalidate(new Headers(), "businesses", `business:${record.slug}`),
    });
  }),

  http.put(
    `${API}/admin/businesses/:businessId/items/:itemId`,
    async ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.edit");
      if ("response" in auth) return auth.response;
      const record = findRecord(String(params.businessId));
      const items = record ? itemsOf(record) : [];
      const existing = items.find((i) => i.id === params.itemId);
      if (!record || !existing) return error(404, "not_found", "Topilmadi");
      const parsed = parseItem(await readJson(request));
      if ("fields" in parsed)
        return error(400, "validation_error", "Maʼlumotlar notoʻgʻri", parsed.fields);
      const item: Item = { ...existing, ...parsed.item };
      demoState.items.set(
        record.id,
        items.map((i) => (i.id === item.id ? item : i)),
      );
      audit(auth.admin, "item.update", "item", item.id, `${record.name}: ${item.name}`);
      return HttpResponse.json(item, {
        headers: revalidate(new Headers(), "businesses", `business:${record.slug}`),
      });
    },
  ),

  http.delete(
    `${API}/admin/businesses/:businessId/items/:itemId`,
    ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.edit");
      if ("response" in auth) return auth.response;
      const record = findRecord(String(params.businessId));
      const items = record ? itemsOf(record) : [];
      if (!record || !items.some((i) => i.id === params.itemId))
        return error(404, "not_found", "Topilmadi");
      demoState.items.set(
        record.id,
        items.filter((i) => i.id !== params.itemId),
      );
      audit(
        auth.admin,
        "item.delete",
        "item",
        String(params.itemId),
        `${record.name}: mahsulot o'chirildi`,
      );
      return new HttpResponse(null, {
        status: 204,
        headers: revalidate(new Headers(), "businesses", `business:${record.slug}`),
      });
    },
  ),

  // Yuklangan rasmlar — ommaviy, o'zgarmas (ID har yuklashda yangi)
  http.get(`${API}/media/:mediaId`, ({ params }) => {
    const media = demoState.media.get(String(params.mediaId));
    if (!media) return error(404, "not_found", "Topilmadi");
    return new HttpResponse(media.bytes, {
      headers: {
        "Content-Type": media.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }),
];
