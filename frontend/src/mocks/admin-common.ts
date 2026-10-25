import { HttpResponse, type DefaultBodyType, type StrictRequest } from "msw";
import type { AdminPermission, ApiError } from "@/lib/api/types";
import {
  ADMIN_SESSION_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  demoState,
  permissionsOf,
  type AuditEntry,
  type DemoAdmin,
} from "./demo-state";
import { DISTRICTS } from "./fixtures/districts";

/**
 * Admin handler'lari uchun umumiy qoidalar: sessiya + CSRF + ruxsat (ADR-0009), audit jurnali,
 * kesh yangilash sarlavhasi. Backend (Django) xuddi shu tekshiruvlarni har bir endpointda bajaradi.
 */

export const API = "*/api/v1";
export const REVALIDATE_HEADER = "x-demo-revalidate";

export type Lang = "uz" | "ru";
export type Fields = Record<string, string[]>;

export function error(status: number, code: string, message: string, fields?: Fields) {
  return HttpResponse.json<ApiError>({ code, message, fields }, { status });
}

export function invalid(fields: Fields) {
  return error(400, "validation_error", "Maʼlumotlar notoʻgʻri", fields);
}

export function langOf(request: Request): Lang {
  return new URL(request.url).searchParams.get("lang") === "ru" ? "ru" : "uz";
}

/** Javobda kesh teglarini e'lon qiladi — route handler ularni revalidateTag bilan yangilaydi */
export function revalidate(headers: Headers, ...tags: string[]) {
  headers.set(REVALIDATE_HEADER, [...new Set(tags)].join(","));
  return headers;
}

export function audit(
  admin: DemoAdmin | null,
  action: string,
  targetType: AuditEntry["targetType"],
  targetId: string,
  summary: string,
) {
  demoState.audit.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    adminId: admin?.id ?? null,
    action,
    targetType,
    targetId,
    summary,
  });
}

/**
 * Admin sessiyasi + (o'zgartiruvchi so'rovlarda) CSRF + ruxsat.
 * null — faqat sessiya; "root" — faqat Root (administratorlar va rollarni boshqarish, ADR-0009).
 */
export function authorize(
  request: StrictRequest<DefaultBodyType>,
  cookies: Record<string, string>,
  permission: AdminPermission | "root" | null,
): { admin: DemoAdmin } | { response: Response } {
  const token = cookies[ADMIN_SESSION_COOKIE];
  const session = token ? demoState.adminSessions.get(token) : undefined;
  if (!session || session.expiresAt < Date.now()) {
    if (token) demoState.adminSessions.delete(token);
    return { response: error(401, "not_authenticated", "Admin sifatida kiring") };
  }
  const admin = demoState.admins.find((a) => a.id === session.adminId);
  if (!admin || !admin.isActive) {
    demoState.adminSessions.delete(token ?? "");
    return { response: error(401, "not_authenticated", "Admin sifatida kiring") };
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    const header = request.headers.get(CSRF_HEADER);
    if (!header || header !== cookies[CSRF_COOKIE] || header !== session.csrfToken) {
      return {
        response: error(403, "csrf_failed", "Xavfsizlik tekshiruvi o'tmadi. Sahifani yangilang."),
      };
    }
  }
  if (permission === "root" && !admin.isRoot) {
    return { response: error(403, "root_required", "Bu amal faqat Root uchun") };
  }
  if (permission && permission !== "root" && !permissionsOf(admin).includes(permission)) {
    return { response: error(403, "permission_denied", "Bu amal uchun ruxsatingiz yo'q") };
  }
  return { admin };
}

/** /admin/me va 2FA javobi: maxfiy maydonlarsiz, amaldagi ruxsatlar bilan */
export function toAdminMe(admin: DemoAdmin) {
  return {
    id: admin.id,
    username: admin.username,
    displayName: admin.displayName,
    isRoot: admin.isRoot,
    permissions: permissionsOf(admin),
  };
}

/** Tasodifiy matn (vaqtinchalik parol, hisobot tokeni) — kriptografik generator */
export function randomToken(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Matn maydoni: kesilgan qiymat yoki bo'sh satr */
export function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** page va pageSize (1–50) — barcha admin ro'yxatlari uchun bir xil */
export function paginate<T>(request: Request, all: T[]) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20) || 20));
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), total: all.length, page, pageSize };
}

export function slugify(name: string): string {
  const latin = name
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return latin || "biznes";
}

export const districtBySlug = new Map(DISTRICTS.map((d) => [d.slug, d]));

export function districtRef(slug: string, lang: Lang) {
  const district = districtBySlug.get(slug);
  return { slug, name: district?.name[lang] ?? slug };
}
