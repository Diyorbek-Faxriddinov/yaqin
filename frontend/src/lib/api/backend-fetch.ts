import type { ApiError } from "./types";

/** Backend javob bermasa sahifa cheksiz kutmaydi — xato sahifasi chiqadi (API_TIMEOUT_MS) */
export const DEFAULT_API_TIMEOUT_MS = 10_000;

export class BackendUnavailableError extends Error {
  readonly status = 503;
  readonly body: ApiError;

  constructor(readonly reason: "backend_timeout" | "backend_unavailable") {
    super(
      reason === "backend_timeout" ? "Backend vaqtida javob bermadi" : "Backendga ulanib boʻlmadi",
    );
    this.name = "BackendUnavailableError";
    this.body = { code: reason, message: this.message };
  }
}

/**
 * Server tomonidagi API so'rovlari uchun fetch: vaqt chegarasi va tushunarli xato. Logga faqat
 * usul va yo'l yoziladi — query string'da joylashuv (lat/lng) bo'lishi mumkin (maxfiylik siyosati).
 */
export function createBackendFetch(
  timeoutMs: number,
  baseFetch: typeof fetch = fetch,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]);
    try {
      return await baseFetch(request, { signal });
    } catch (error) {
      // Nomi bo'yicha: DOMException klassi turli muhitlarda (Node, jsdom) har xil bo'lishi mumkin
      const timedOut = (error as { name?: unknown } | null)?.name === "TimeoutError";
      const failure = new BackendUnavailableError(
        timedOut ? "backend_timeout" : "backend_unavailable",
      );
      console.error(`API ${request.method} ${new URL(request.url).pathname}: ${failure.reason}`);
      throw failure;
    }
  };
}
