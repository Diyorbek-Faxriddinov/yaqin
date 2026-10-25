import { HttpResponse, type DefaultBodyType, type StrictRequest } from "msw";
import type { AdminPermission, ApiError } from "@/lib/api/types";
import {
  ADMIN_SESSION_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  demoState,
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
  admin: DemoAdmin,
  action: string,
  targetType: AuditEntry["targetType"],
  targetId: string,
  summary: string,
) {
  demoState.audit.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    adminId: admin.id,
    action,
    targetType,
    targetId,
    summary,
  });
}

/** Admin sessiyasi + (o'zgartiruvchi so'rovlarda) CSRF + ruxsat (null — faqat sessiya) */
export function authorize(
  request: StrictRequest<DefaultBodyType>,
  cookies: Record<string, string>,
  permission: AdminPermission | null,
): { admin: DemoAdmin } | { response: Response } {
  const token = cookies[ADMIN_SESSION_COOKIE];
  const session = token ? demoState.adminSessions.get(token) : undefined;
  if (!session || session.expiresAt < Date.now()) {
    if (token) demoState.adminSessions.delete(token);
    return { response: error(401, "not_authenticated", "Admin sifatida kiring") };
  }
  const admin = demoState.admins.find((a) => a.id === session.adminId);
  if (!admin) return { response: error(401, "not_authenticated", "Admin sifatida kiring") };

  if (!["GET", "HEAD"].includes(request.method)) {
    const header = request.headers.get(CSRF_HEADER);
    if (!header || header !== cookies[CSRF_COOKIE] || header !== session.csrfToken) {
      return {
        response: error(403, "csrf_failed", "Xavfsizlik tekshiruvi o'tmadi. Sahifani yangilang."),
      };
    }
  }
  if (permission && !admin.isRoot && !admin.permissions.includes(permission)) {
    return { response: error(403, "permission_denied", "Bu amal uchun ruxsatingiz yo'q") };
  }
  return { admin };
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
