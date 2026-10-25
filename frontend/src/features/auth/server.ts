import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { api, ApiRequestError } from "@/lib/api/server";
import type { ApiError, Me } from "@/lib/api/types";

/**
 * Server komponentlari foydalanuvchi nomidan API'ga murojaat qilishi uchun cookie'lar.
 * Sessiya cookie'si httpOnly — faqat server orqali uzatiladi (ADR-0012).
 */
export async function sessionHeaders(): Promise<{ cookie: string }> {
  const store = await cookies();
  return {
    cookie: store
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; "),
  };
}

/** Joriy foydalanuvchi yoki null (kirilmagan / sessiya eskirgan) */
export async function getCurrentUser(): Promise<Me | null> {
  // Foydalanuvchiga xos — har so'rovda; prerender shu yerda to'xtaydi (cacheComponents)
  await connection();
  const { data, error, response } = await api.GET("/me", { headers: await sessionHeaders() });
  if (response.status === 401) return null;
  if (!response.ok || !data) throw new ApiRequestError(response.status, error as ApiError);
  return data;
}

/** Kirish talab qilinadigan sahifalar uchun: kirilmagan bo'lsa — /kirish?next=... */
export async function requireUser(currentPath: string): Promise<Me> {
  const user = await getCurrentUser();
  if (!user) {
    const locale = (await getLocale()) as AppLocale;
    return redirect({ href: `/kirish?next=${encodeURIComponent(currentPath)}`, locale });
  }
  return user;
}
