import { http, HttpResponse, type DefaultBodyType, type StrictRequest } from "msw";
import type { ApiError, Complaint, ComplaintReason, MyReview } from "@/lib/api/types";
import { getBusiness, listBusinesses } from "./db";
import {
  createDemoUser,
  CSRF_COOKIE,
  CSRF_HEADER,
  deleteDemoUser,
  demoState,
  findBusinessRecord,
  isUserBlocked,
  publicBusinesses,
  SESSION_COOKIE,
  type DemoSession,
  type StoredComplaint,
  type StoredReview,
} from "./demo-state";

/**
 * Demo autentifikatsiya va "men" endpointlari. Backend (Django) xatti-harakatini takrorlaydi:
 * httpOnly sessiya cookie'si + CSRF double-submit (ADR-0012).
 */

const API = "*/api/v1";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const REASONS: ComplaintReason[] = [
  "wrong_info",
  "closed_permanently",
  "wrong_location",
  "fake_reviews",
  "fraud",
  "other",
];

function error(status: number, code: string, message: string, fields?: ApiError["fields"]) {
  return HttpResponse.json<ApiError>({ code, message, fields }, { status });
}

function cookieHeader(
  name: string,
  value: string,
  maxAge: number,
  request: Request,
  httpOnly: boolean,
) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax${httpOnly ? "; HttpOnly" : ""}${secure}`;
}

/** Sessiyani tekshiradi; o'zgartiruvchi so'rovlarda CSRF tokenini ham */
function authenticate(
  request: StrictRequest<DefaultBodyType>,
  cookies: Record<string, string>,
): { session: DemoSession } | { response: Response } {
  const token = cookies[SESSION_COOKIE];
  const session = token ? demoState.sessions.get(token) : undefined;
  if (!session || !demoState.users.has(session.userId)) {
    return { response: error(401, "not_authenticated", "Avval tizimga kiring") };
  }
  // Bloklashda sessiyalar o'chiriladi; bu — qo'shimcha himoya qatlami
  if (isUserBlocked(session.userId)) {
    return { response: error(403, "account_blocked", "Akkauntingiz bloklangan") };
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    const header = request.headers.get(CSRF_HEADER);
    if (!header || header !== cookies[CSRF_COOKIE] || header !== session.csrfToken) {
      return {
        response: error(403, "csrf_failed", "Xavfsizlik tekshiruvi o'tmadi. Sahifani yangilang."),
      };
    }
  }
  return { session };
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function businessRef(businessId: string) {
  const business = findBusinessRecord(businessId);
  return business ? { slug: business.slug, name: business.name } : null;
}

// Biznes nomi joriy holatdan olinadi — nomi o'zgartirilgan bo'lsa ham to'g'ri ko'rsatiladi
function toMyReview(review: StoredReview): MyReview {
  return {
    id: review.id,
    business: businessRef(review.businessId) ?? { slug: "", name: "—" },
    rating: review.rating,
    text: review.text,
    status: review.status,
    rejectionReason: review.rejectionReason,
    createdAt: review.createdAt,
  };
}

function toMyComplaint(complaint: StoredComplaint): Complaint {
  return {
    id: complaint.id,
    business: businessRef(complaint.businessId) ?? { slug: "", name: "—" },
    reason: complaint.reason,
    text: complaint.text,
    status: complaint.status,
    resolutionNote: complaint.resolutionNote,
    createdAt: complaint.createdAt,
  };
}

export const meHandlers = [
  http.post(`${API}/auth/demo`, ({ request }) => {
    const { sessionToken, session, user } = createDemoUser();
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      cookieHeader(SESSION_COOKIE, sessionToken, THIRTY_DAYS, request, true),
    );
    headers.append(
      "Set-Cookie",
      cookieHeader(CSRF_COOKIE, session.csrfToken, THIRTY_DAYS, request, false),
    );
    return HttpResponse.json(user, { headers });
  }),

  // Demo rejimida Telegram/Google imzosini tekshirib bo'lmaydi — halol rad etamiz
  http.post(`${API}/auth/telegram`, () =>
    error(401, "provider_unavailable", "Telegram orqali kirish backend ulanganda ishlaydi"),
  ),
  http.post(`${API}/auth/google`, () =>
    error(401, "provider_unavailable", "Google orqali kirish backend ulanganda ishlaydi"),
  ),

  http.post(`${API}/auth/logout`, ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    demoState.sessions.delete(cookies[SESSION_COOKIE] ?? "");
    const headers = new Headers();
    headers.append("Set-Cookie", cookieHeader(SESSION_COOKIE, "", 0, request, true));
    headers.append("Set-Cookie", cookieHeader(CSRF_COOKIE, "", 0, request, false));
    return new HttpResponse(null, { status: 204, headers });
  }),

  http.get(`${API}/me`, ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    return HttpResponse.json(demoState.users.get(auth.session.userId));
  }),

  http.patch(`${API}/me`, async ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const body = await readJson(request);
    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    if (displayName.length < 2 || displayName.length > 40) {
      return error(400, "validation_error", "Ism 2–40 belgidan iborat boʻlishi kerak", {
        displayName: ["2–40 belgi"],
      });
    }
    const user = demoState.users.get(auth.session.userId);
    if (!user) return error(401, "not_authenticated", "Avval tizimga kiring");
    const updated = { ...user, displayName };
    demoState.users.set(user.id, updated);
    return HttpResponse.json(updated);
  }),

  http.delete(`${API}/me`, ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    deleteDemoUser(auth.session.userId);
    const headers = new Headers();
    headers.append("Set-Cookie", cookieHeader(SESSION_COOKIE, "", 0, request, true));
    headers.append("Set-Cookie", cookieHeader(CSRF_COOKIE, "", 0, request, false));
    return new HttpResponse(null, { status: 204, headers });
  }),

  http.get(`${API}/me/favorites/ids`, ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    return HttpResponse.json(demoState.favorites.get(auth.session.userId) ?? []);
  }),

  http.get(`${API}/me/favorites`, ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const lang = new URL(request.url).searchParams.get("lang") === "ru" ? "ru" : "uz";
    const ids = demoState.favorites.get(auth.session.userId) ?? [];
    const all = listBusinesses({ lang, pageSize: 1000 }).items;
    // Oxirgi qo'shilgani birinchi
    return HttpResponse.json(
      [...ids].reverse().flatMap((id) => all.filter((business) => business.id === id)),
    );
  }),

  http.put(`${API}/me/favorites/:businessId`, ({ request, cookies, params }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const businessId = String(params.businessId);
    if (!publicBusinesses().some((b) => b.id === businessId)) {
      return error(404, "not_found", "Topilmadi");
    }
    const ids = demoState.favorites.get(auth.session.userId) ?? [];
    if (!ids.includes(businessId))
      demoState.favorites.set(auth.session.userId, [...ids, businessId]);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${API}/me/favorites/:businessId`, ({ request, cookies, params }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const ids = demoState.favorites.get(auth.session.userId) ?? [];
    demoState.favorites.set(
      auth.session.userId,
      ids.filter((id) => id !== String(params.businessId)),
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/businesses/:slug/reviews`, async ({ request, cookies, params }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const business = getBusiness(String(params.slug), "uz");
    if (!business) return error(404, "not_found", "Topilmadi");

    const body = await readJson(request);
    const rating = body?.rating;
    const text = typeof body?.text === "string" ? body.text.trim() : null;
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return error(400, "validation_error", "Bahoni tanlang", { rating: ["1–5"] });
    }
    if (text && text.length > 1000) {
      return error(400, "validation_error", "Sharh juda uzun", {
        text: ["Ko'pi bilan 1000 belgi"],
      });
    }
    const exists = demoState.reviews.some(
      (r) => r.userId === auth.session.userId && r.businessId === business.id,
    );
    if (exists) {
      return error(409, "review_exists", "Siz bu biznesga allaqachon sharh qoldirgansiz");
    }

    const review: StoredReview = {
      id: crypto.randomUUID(),
      userId: auth.session.userId,
      businessId: business.id,
      rating,
      text: text || null,
      status: "pending",
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      moderatedAt: null,
    };
    demoState.reviews.push(review);
    return HttpResponse.json(toMyReview(review), { status: 201 });
  }),

  http.get(`${API}/me/reviews`, ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    return HttpResponse.json(
      demoState.reviews
        .filter((r) => r.userId === auth.session.userId)
        .reverse()
        .map(toMyReview),
    );
  }),

  http.delete(`${API}/me/reviews/:reviewId`, ({ request, cookies, params }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const index = demoState.reviews.findIndex(
      (r) => r.id === String(params.reviewId) && r.userId === auth.session.userId,
    );
    // Boshqa foydalanuvchining sharhi ham "topilmadi" — mavjudligini oshkor qilmaymiz
    if (index < 0) return error(404, "not_found", "Topilmadi");
    demoState.reviews.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/complaints`, async ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    const body = await readJson(request);
    const businessId = typeof body?.businessId === "string" ? body.businessId : "";
    const reason = body?.reason as ComplaintReason;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const business = businessRef(businessId);

    const fields: Record<string, string[]> = {};
    if (!business) fields.businessId = ["Biznes topilmadi"];
    if (!REASONS.includes(reason)) fields.reason = ["Sababni tanlang"];
    if (reason === "other" && text.length < 10) fields.text = ["Kamida 10 belgi"];
    if (text.length > 1000) fields.text = ["Ko'pi bilan 1000 belgi"];
    if (!business || Object.keys(fields).length > 0) {
      return error(400, "validation_error", "Maʼlumotlar notoʻgʻri", fields);
    }

    const now = new Date().toISOString();
    const complaint: StoredComplaint = {
      id: crypto.randomUUID(),
      userId: auth.session.userId,
      businessId,
      reason,
      text: text || null,
      status: "open",
      resolutionNote: null,
      createdAt: now,
      updatedAt: now,
    };
    demoState.complaints.push(complaint);
    return HttpResponse.json(toMyComplaint(complaint), { status: 201 });
  }),

  http.get(`${API}/me/complaints`, ({ request, cookies }) => {
    const auth = authenticate(request, cookies);
    if ("response" in auth) return auth.response;
    return HttpResponse.json(
      demoState.complaints
        .filter((c) => c.userId === auth.session.userId)
        .reverse()
        .map(toMyComplaint),
    );
  }),
];
