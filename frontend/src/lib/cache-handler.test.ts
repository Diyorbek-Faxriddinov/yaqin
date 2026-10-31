// @vitest-environment node
import defaultHandlers from "next/dist/server/lib/cache-handlers/default.js";
import { describe, expect, it } from "vitest";
import handler from "../../cache-handler.mjs";

type Handler = {
  get: (key: string, softTags: string[]) => Promise<unknown>;
  set: (key: string, pending: Promise<unknown>) => Promise<void>;
};

const HANG = Symbol("osilib qoldi");
const within = <T>(promise: Promise<T>, ms = 500) =>
  Promise.race([promise, new Promise<typeof HANG>((r) => setTimeout(() => r(HANG), ms))]);

/** To'ldirish xato bilan tugaydi (backend javob bermadi), keyin shu kalit qayta so'raladi */
async function failedFillThenGet(cache: Handler) {
  void cache.set("kalit", Promise.reject(new Error("backend_timeout"))).catch(() => undefined);
  await new Promise((r) => setTimeout(r, 10));
  return within(cache.get("kalit", []));
}

describe("cache-handler.mjs", () => {
  it("xato bilan tugagan to'ldirishdan keyin kalit bo'shaydi — keyingi so'rov kesh yo'q deb davom etadi", async () => {
    expect(await failedFillThenGet(handler as unknown as Handler)).toBeUndefined();
  });

  it("muvaffaqiyatli yozuv odatdagidek saqlanadi va o'qiladi", async () => {
    const cache = handler as unknown as Handler;
    const value = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("maʼlumot"));
        controller.close();
      },
    });
    await cache.set(
      "yaxshi",
      Promise.resolve({
        value,
        tags: [],
        stale: 300,
        timestamp: Date.now(),
        expire: 3600,
        revalidate: 900,
      }),
    );
    const entry = (await cache.get("yaxshi", [])) as { value: ReadableStream } | undefined;
    expect(await new Response(entry?.value).text()).toBe("maʼlumot");
  });

  it("Next'ning standart ishlovchisi hali ham osilib qoladi (tuzatilsa — o'ramni olib tashlash mumkin)", async () => {
    const raw = defaultHandlers.createDefaultCacheHandler(1024 * 1024) as unknown as Handler;
    expect(await failedFillThenGet(raw)).toBe(HANG);
  });
});
