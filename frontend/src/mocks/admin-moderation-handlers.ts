import { http, HttpResponse } from "msw";
import type {
  AdminBusinessRequest,
  AdminComplaint,
  AdminReview,
  AdminUser,
  ComplaintStatus,
  ReviewStatus,
} from "@/lib/api/types";
import { normalizeUzPhone } from "@/lib/format/phone";
import {
  API,
  audit,
  authorize,
  districtBySlug,
  districtRef,
  error,
  invalid,
  langOf,
  paginate,
  readJson,
  revalidate,
  text,
  type Fields,
  type Lang,
} from "./admin-common";
import { createDraftBusiness, parseBusinessCreate, toAdminBusiness } from "./admin-handlers";
import {
  demoState,
  findBusinessRecord,
  type StoredBusinessRequest,
  type StoredComplaint,
  type StoredReview,
} from "./demo-state";

/**
 * Moderatsiya navbatlari: sharhlar (review.moderate), shikoyatlar (complaint.manage),
 * biznes so'rovlari (business.edit), foydalanuvchilar (user.view / user.manage).
 * Navbatdagi yozuvlar eng eskisi birinchi — hech biri unutilib qolmasligi uchun.
 */

const REVIEW_STATUSES = new Set<ReviewStatus>(["pending", "published", "rejected"]);
const COMPLAINT_STATUSES = new Set<ComplaintStatus>(["open", "in_review", "resolved", "rejected"]);
const REQUEST_STATUSES = new Set<StoredBusinessRequest["status"]>([
  "new",
  "contacted",
  "converted",
  "rejected",
]);

const oldestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  a.createdAt.localeCompare(b.createdAt);
const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) =>
  b.createdAt.localeCompare(a.createdAt);

function statusParam<T extends string>(request: Request, allowed: Set<T>): T | null {
  const value = new URL(request.url).searchParams.get("status");
  return value && allowed.has(value as T) ? (value as T) : null;
}

function businessRef(businessId: string) {
  const business = findBusinessRecord(businessId);
  return business ? { id: business.id, slug: business.slug, name: business.name } : null;
}

function userRef(userId: string) {
  return { id: userId, displayName: demoState.users.get(userId)?.displayName ?? "—" };
}

function toAdminReview(review: StoredReview): AdminReview | null {
  const business = businessRef(review.businessId);
  if (!business) return null;
  return {
    id: review.id,
    business,
    author: userRef(review.userId),
    rating: review.rating,
    text: review.text,
    status: review.status,
    rejectionReason: review.rejectionReason,
    createdAt: review.createdAt,
    moderatedAt: review.moderatedAt,
  };
}

function toAdminComplaint(complaint: StoredComplaint): AdminComplaint | null {
  const business = businessRef(complaint.businessId);
  if (!business) return null;
  return {
    id: complaint.id,
    business,
    reporter: userRef(complaint.userId),
    reason: complaint.reason,
    text: complaint.text,
    status: complaint.status,
    resolutionNote: complaint.resolutionNote,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
}

function toAdminRequest(request: StoredBusinessRequest, lang: Lang): AdminBusinessRequest {
  return {
    id: request.id,
    businessName: request.businessName,
    activity: request.activity,
    district: request.districtSlug ? districtRef(request.districtSlug, lang) : null,
    address: request.address,
    contactName: request.contactName,
    phone: request.phone,
    note: request.note,
    status: request.status,
    adminNote: request.adminNote,
    businessId: request.businessId,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function toAdminUser(userId: string): AdminUser | null {
  const user = demoState.users.get(userId);
  if (!user) return null;
  const blocked = demoState.blockedUsers.get(userId);
  return {
    id: user.id,
    displayName: user.displayName,
    provider: user.provider,
    createdAt: user.createdAt,
    isBlocked: Boolean(blocked),
    blockedReason: blocked?.reason ?? null,
    reviewsCount: demoState.reviews.filter((r) => r.userId === userId).length,
    complaintsCount: demoState.complaints.filter((c) => c.userId === userId).length,
  };
}

/** Majburiy izoh/sabab: min–max belgi, aks holda xato matni */
function requiredNote(value: unknown, min: number, max: number): string | { problem: string } {
  const note = text(value);
  return note.length >= min && note.length <= max ? note : { problem: `${min}–${max} belgi` };
}

export const adminModerationHandlers = [
  // --- Ommaviy: "Biznesingizni qo'shing" so'rovi ---
  http.post(`${API}/business-requests`, async ({ request }) => {
    const body = await readJson(request);
    const businessName = text(body?.businessName);
    const contactName = text(body?.contactName);
    const phone = normalizeUzPhone(text(body?.phone));
    const activity = text(body?.activity);
    const address = text(body?.address);
    const note = text(body?.note);
    const districtSlug = typeof body?.districtSlug === "string" ? body.districtSlug : null;

    const fields: Fields = {};
    if (businessName.length < 2 || businessName.length > 120) fields.businessName = ["2–120 belgi"];
    if (contactName.length < 2 || contactName.length > 60) fields.contactName = ["2–60 belgi"];
    if (!phone) fields.phone = ["Raqam formati: +998XXXXXXXXX"];
    if (activity.length > 100) fields.activity = ["Koʻpi bilan 100 belgi"];
    if (address.length > 300) fields.address = ["Koʻpi bilan 300 belgi"];
    if (note.length > 1000) fields.note = ["Koʻpi bilan 1000 belgi"];
    if (districtSlug && !districtBySlug.has(districtSlug))
      fields.districtSlug = ["Tuman notoʻgʻri"];
    if (body?.agree !== true) fields.agree = ["Rozilik kerak"];
    if (Object.keys(fields).length > 0 || !phone) return invalid(fields);

    const now = new Date().toISOString();
    const stored: StoredBusinessRequest = {
      id: crypto.randomUUID(),
      businessName,
      activity: activity || null,
      districtSlug,
      address: address || null,
      contactName,
      phone,
      note: note || null,
      status: "new",
      adminNote: null,
      businessId: null,
      createdAt: now,
      updatedAt: now,
    };
    demoState.requests.push(stored);
    return HttpResponse.json({ id: stored.id }, { status: 201 });
  }),

  // --- Sharhlar ---
  http.get(`${API}/admin/reviews`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "review.moderate");
    if ("response" in auth) return auth.response;
    const status = statusParam(request, REVIEW_STATUSES);
    const all = demoState.reviews
      .filter((r) => !status || r.status === status)
      .sort(status === "pending" ? oldestFirst : newestFirst)
      .flatMap((r) => toAdminReview(r) ?? []);
    return HttpResponse.json(paginate(request, all));
  }),

  http.patch(`${API}/admin/reviews/:reviewId`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "review.moderate");
    if ("response" in auth) return auth.response;
    const review = demoState.reviews.find((r) => r.id === params.reviewId);
    const business = review ? findBusinessRecord(review.businessId) : undefined;
    if (!review || !business) return error(404, "not_found", "Topilmadi");

    const body = await readJson(request);
    const status = body?.status;
    if (status !== "published" && status !== "rejected") {
      return invalid({ status: ["Holat notoʻgʻri"] });
    }
    let reason: string | null = null;
    if (status === "rejected") {
      const note = requiredNote(body?.rejectionReason, 3, 200);
      if (typeof note !== "string") return invalid({ rejectionReason: [note.problem] });
      reason = note;
    }
    review.status = status;
    review.rejectionReason = reason;
    review.moderatedAt = new Date().toISOString();
    audit(
      auth.admin,
      `review.${status === "published" ? "publish" : "reject"}`,
      "review",
      review.id,
      `${business.name}: ${review.rating}★${reason ? ` — ${reason}` : ""}`,
    );
    return HttpResponse.json(toAdminReview(review), {
      // Chop etilgan sharh biznes sahifasida va reytingda (kartalarda ham) ko'rinadi
      headers: revalidate(
        new Headers(),
        "businesses",
        `business:${business.slug}`,
        `reviews:${business.slug}`,
      ),
    });
  }),

  // --- Shikoyatlar ---
  http.get(`${API}/admin/complaints`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "complaint.manage");
    if ("response" in auth) return auth.response;
    const status = statusParam(request, COMPLAINT_STATUSES);
    const queue = status === "open" || status === "in_review";
    const all = demoState.complaints
      .filter((c) => !status || c.status === status)
      .sort(queue ? oldestFirst : newestFirst)
      .flatMap((c) => toAdminComplaint(c) ?? []);
    return HttpResponse.json(paginate(request, all));
  }),

  http.patch(`${API}/admin/complaints/:complaintId`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "complaint.manage");
    if ("response" in auth) return auth.response;
    const complaint = demoState.complaints.find((c) => c.id === params.complaintId);
    if (!complaint || !findBusinessRecord(complaint.businessId))
      return error(404, "not_found", "Topilmadi");

    const body = await readJson(request);
    const status = body?.status;
    if (status !== "in_review" && status !== "resolved" && status !== "rejected") {
      return invalid({ status: ["Holat notoʻgʻri"] });
    }
    let note: string | null = null;
    if (status !== "in_review") {
      const value = requiredNote(body?.resolutionNote, 3, 500);
      if (typeof value !== "string") return invalid({ resolutionNote: [value.problem] });
      note = value;
    }
    complaint.status = status;
    complaint.resolutionNote = note;
    complaint.updatedAt = new Date().toISOString();
    audit(
      auth.admin,
      `complaint.${status}`,
      "complaint",
      complaint.id,
      `${businessRef(complaint.businessId)?.name ?? "—"}: ${note ?? "koʻrib chiqilmoqda"}`,
    );
    return HttpResponse.json(toAdminComplaint(complaint));
  }),

  // --- Biznes so'rovlari (telefon raqamlari bor — business.edit) ---
  http.get(`${API}/admin/business-requests`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "business.edit");
    if ("response" in auth) return auth.response;
    const status = statusParam(request, REQUEST_STATUSES);
    const lang = langOf(request);
    const all = demoState.requests
      .filter((r) => !status || r.status === status)
      .sort(newestFirst)
      .map((r) => toAdminRequest(r, lang));
    return HttpResponse.json(paginate(request, all));
  }),

  http.patch(`${API}/admin/business-requests/:requestId`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "business.edit");
    if ("response" in auth) return auth.response;
    const stored = demoState.requests.find((r) => r.id === params.requestId);
    if (!stored) return error(404, "not_found", "Topilmadi");
    if (stored.status === "converted") {
      return error(409, "already_converted", "Soʻrovdan biznes yaratilgan — holati oʻzgarmaydi");
    }
    const body = (await readJson(request)) ?? {};
    const status = body.status;
    if (status !== "new" && status !== "contacted" && status !== "rejected") {
      return invalid({ status: ["Holat notoʻgʻri"] });
    }
    const note = "adminNote" in body ? text(body.adminNote) : (stored.adminNote ?? "");
    if (note.length > 500) return invalid({ adminNote: ["Koʻpi bilan 500 belgi"] });
    if (status === "rejected" && note.length < 3) {
      return invalid({ adminNote: ["Rad etish sababini yozing (kamida 3 belgi)"] });
    }
    stored.status = status;
    stored.adminNote = note || null;
    stored.updatedAt = new Date().toISOString();
    audit(auth.admin, `request.${status}`, "request", stored.id, stored.businessName);
    return HttpResponse.json(toAdminRequest(stored, langOf(request)));
  }),

  http.post(
    `${API}/admin/business-requests/:requestId/convert`,
    async ({ request, cookies, params }) => {
      const auth = authorize(request, cookies, "business.edit");
      if ("response" in auth) return auth.response;
      const stored = demoState.requests.find((r) => r.id === params.requestId);
      if (!stored) return error(404, "not_found", "Topilmadi");
      if (stored.status === "converted") {
        return error(409, "already_converted", "Bu soʻrovdan biznes allaqachon yaratilgan");
      }
      const parsed = parseBusinessCreate(await readJson(request));
      if ("fields" in parsed) return invalid(parsed.fields);

      // Joylashuv, rasmlar va rozilik — joyiga borganda (ADR-0007)
      const record = createDraftBusiness(parsed.value, {
        address: { text: stored.address ?? "", landmark: null },
        phones: [{ number: stored.phone, label: null }],
      });
      stored.status = "converted";
      stored.businessId = record.id;
      stored.updatedAt = new Date().toISOString();
      audit(auth.admin, "request.convert", "request", stored.id, `Qoralama: ${record.name}`);
      audit(auth.admin, "business.create", "business", record.id, `Soʻrovdan: ${record.name}`);
      return HttpResponse.json(toAdminBusiness(record, langOf(request)), { status: 201 });
    },
  ),

  // --- Foydalanuvchilar (kontakt maʼlumotlari qaytarilmaydi) ---
  http.get(`${API}/admin/users`, ({ request, cookies }) => {
    const auth = authorize(request, cookies, "user.view");
    if ("response" in auth) return auth.response;
    const url = new URL(request.url);
    const q = text(url.searchParams.get("q")).toLowerCase();
    const blocked = url.searchParams.get("blocked");
    const all = [...demoState.users.values()]
      .filter((u) => !q || u.displayName.toLowerCase().includes(q))
      .filter((u) => blocked === null || demoState.blockedUsers.has(u.id) === (blocked === "true"))
      .sort(newestFirst)
      .flatMap((u) => toAdminUser(u.id) ?? []);
    return HttpResponse.json(paginate(request, all));
  }),

  http.patch(`${API}/admin/users/:userId`, async ({ request, cookies, params }) => {
    const auth = authorize(request, cookies, "user.manage");
    if ("response" in auth) return auth.response;
    const userId = String(params.userId);
    const user = demoState.users.get(userId);
    if (!user) return error(404, "not_found", "Topilmadi");
    const body = await readJson(request);
    if (typeof body?.isBlocked !== "boolean") return invalid({ isBlocked: ["Holat kerak"] });

    if (body.isBlocked) {
      const reason = requiredNote(body.blockedReason, 3, 200);
      if (typeof reason !== "string") return invalid({ blockedReason: [reason.problem] });
      demoState.blockedUsers.set(userId, { reason, at: new Date().toISOString() });
      // Faol sessiyalar darhol tugatiladi
      for (const [token, session] of demoState.sessions) {
        if (session.userId === userId) demoState.sessions.delete(token);
      }
      audit(auth.admin, "user.block", "user", userId, `${user.displayName}: ${reason}`);
    } else {
      demoState.blockedUsers.delete(userId);
      audit(auth.admin, "user.unblock", "user", userId, user.displayName);
    }
    return HttpResponse.json(toAdminUser(userId));
  }),
];
