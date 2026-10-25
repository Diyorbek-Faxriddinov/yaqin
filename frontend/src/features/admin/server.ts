import "server-only";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { sessionHeaders } from "@/features/auth/server";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { api, ApiRequestError } from "@/lib/api/server";
import type { AdminMe, AdminPermission, ApiError } from "@/lib/api/types";

/** Joriy administrator yoki null */
export async function getCurrentAdmin(): Promise<AdminMe | null> {
  await connection();
  const { data, error, response } = await api.GET("/admin/me", { headers: await sessionHeaders() });
  if (response.status === 401) return null;
  if (!response.ok || !data) throw new ApiRequestError(response.status, error as ApiError);
  return data;
}

export function hasPermission(admin: AdminMe, permission: AdminPermission): boolean {
  return admin.isRoot || admin.permissions.includes(permission);
}

/**
 * Admin sahifalari uchun: kirilmagan bo'lsa — /admin/kirish?next=...; ruxsat yo'q bo'lsa — /admin.
 * Interfeysdagi yashirish faqat qulaylik; har bir API so'rovi ruxsatni backendda tekshiradi.
 */
export async function requireAdmin(
  currentPath: string,
  permission?: AdminPermission,
): Promise<AdminMe> {
  const admin = await getCurrentAdmin();
  const locale = (await getLocale()) as AppLocale;
  if (!admin) {
    return redirect({ href: `/admin/kirish?next=${encodeURIComponent(currentPath)}`, locale });
  }
  if (permission && !hasPermission(admin, permission)) {
    return redirect({ href: "/admin", locale });
  }
  return admin;
}
