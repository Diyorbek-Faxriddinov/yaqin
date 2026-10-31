import { afterEach, describe, expect, it, vi } from "vitest";
import { BackendUnavailableError, createBackendFetch } from "./backend-fetch";

const REQUEST = () => new Request("http://backend.test/api/v1/businesses?lat=41.3&lng=69.2");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createBackendFetch", () => {
  it("javob bersa — o'zgarishsiz qaytaradi", async () => {
    const response = new Response("{}", { status: 200 });
    const backendFetch = createBackendFetch(1000, async () => response);
    await expect(backendFetch(REQUEST())).resolves.toBe(response);
  });

  it("javob bermasa — vaqt chegarasidan keyin backend_timeout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Hech qachon javob bermaydigan backend: faqat signal bekor qilganda to'xtaydi
    const hanging = (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    const started = Date.now();
    const error = await createBackendFetch(50, hanging)(REQUEST()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BackendUnavailableError);
    expect((error as BackendUnavailableError).reason).toBe("backend_timeout");
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("ulanib bo'lmasa — backend_unavailable; logda query string yo'q", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const refused = async () => {
      throw new TypeError("fetch failed");
    };
    const error = await createBackendFetch(1000, refused)(REQUEST()).catch((e: unknown) => e);
    expect((error as BackendUnavailableError).reason).toBe("backend_unavailable");
    expect((error as BackendUnavailableError).status).toBe(503);
    const message = String(log.mock.calls[0]?.[0]);
    expect(message).toContain("/api/v1/businesses");
    expect(message).not.toContain("lat=");
  });
});
