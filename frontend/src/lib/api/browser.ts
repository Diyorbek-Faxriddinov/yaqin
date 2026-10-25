"use client";

import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./schema";
import type { ApiError } from "./types";

/**
 * Brauzer uchun tiplangan API klient. So'rovlar o'z domenimizdagi /api/v1 ga ketadi
 * (demo: route handler → mock; production: reverse proxy → backend), cookie'lar avtomatik.
 */

const CSRF_COOKIE = "csrftoken";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCookie(name: string): string | null {
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// CSRF double-submit: o'zgartiruvchi so'rovlarga cookie'dagi token sarlavha sifatida (ADR-0012)
const csrfMiddleware: Middleware = {
  onRequest({ request }) {
    if (!SAFE_METHODS.has(request.method)) {
      const token = readCookie(CSRF_COOKIE);
      if (token) request.headers.set("X-CSRFToken", token);
    }
    return request;
  },
};

/** Multipart (fayl yuklash) kabi openapi-fetch'dan tashqari so'rovlar uchun CSRF sarlavhasi */
export function csrfHeaders(): Record<string, string> {
  const token = readCookie(CSRF_COOKIE);
  return token ? { "X-CSRFToken": token } : {};
}

export const browserApi = createClient<paths>({ baseUrl: "/api/v1", credentials: "same-origin" });
browserApi.use(csrfMiddleware);

export class BrowserApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | undefined,
  ) {
    super(body?.message ?? `API xatosi: ${status}`);
    this.name = "BrowserApiError";
  }
}

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

/** Muvaffaqiyatli javob (204 bo'lsa undefined) yoki BrowserApiError */
export async function call<T>(request: Promise<ApiResult<T>>): Promise<T> {
  const { data, error, response } = await request;
  if (!response.ok) throw new BrowserApiError(response.status, error as ApiError | undefined);
  return data as T;
}
