import "server-only";
import createClient from "openapi-fetch";
import { isDemoMode } from "@/lib/env";
import type { paths } from "./schema";
import type { ApiError } from "./types";

// Demo rejimida so'rovlar tarmoqqa chiqmaydi — mockFetch ularni shu "manzil" bo'yicha javoblaydi
const DEMO_BASE_URL = "http://demo.yaqin.local/api/v1";

function resolveBaseUrl(): string {
  if (isDemoMode) return DEMO_BASE_URL;
  const url = process.env.API_URL;
  if (!url)
    throw new Error("API_URL o'rnatilmagan (demo rejim o'chirilgan, backend manzili kerak)");
  return url;
}

async function demoFetch(request: Request): Promise<Response> {
  // Mock kodi faqat demo rejimida yuklanadi
  const { mockFetch } = await import("@/mocks/fetch");
  return mockFetch(request);
}

/** Server komponentlari uchun tiplangan API klient (OpenAPI kontraktidan) */
export const api = createClient<paths>({
  baseUrl: resolveBaseUrl(),
  fetch: isDemoMode ? demoFetch : undefined,
});

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | undefined,
  ) {
    super(body?.message ?? `API xatosi: ${status}`);
    this.name = "ApiRequestError";
  }
}

type ApiResult<T> = { data?: T; error?: unknown; response: Response };

/** Muvaffaqiyatli javobni qaytaradi, aks holda ApiRequestError tashlaydi */
export async function unwrap<T>(request: Promise<ApiResult<T>>): Promise<T> {
  const { data, error, response } = await request;
  if (!response.ok || data === undefined) {
    throw new ApiRequestError(response.status, error as ApiError | undefined);
  }
  return data;
}

/** 404 bo'lsa null qaytaradi (sahifa notFound() chaqirishi uchun) */
export async function unwrapOrNull<T>(request: Promise<ApiResult<T>>): Promise<T | null> {
  try {
    return await unwrap(request);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}
