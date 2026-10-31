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

/** Signal bekor bo'lganda rad etiladigan promise (sababi bilan) */
function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

/**
 * Server tomonidagi API so'rovlari uchun fetch: vaqt chegarasi va tushunarli xato. Logga faqat
 * usul va yo'l yoziladi — query string'da joylashuv (lat/lng) bo'lishi mumkin (maxfiylik siyosati).
 *
 * Vaqt chegarasi faqat fetch'ga berilgan signalga tayanmaydi: Next eskirgan keshni fonda qayta
 * to'ldirayotganda so'rovdan `signal` ni olib tashlaydi (patch-fetch: "don't pass through signal
 * when revalidating") — javob bermaydigan backendga so'rov abadiy kutardi, keyingi so'rovlar esa
 * unga qo'shilib osilib qolardi (e2e/resilience.spec.ts). Shuning uchun taymer bilan poyga.
 */
export function createBackendFetch(
  timeoutMs: number,
  baseFetch: typeof fetch = fetch,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = AbortSignal.any([request.signal, timeout]);
    try {
      return await Promise.race([baseFetch(request, { signal }), rejectOnAbort(signal)]);
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
