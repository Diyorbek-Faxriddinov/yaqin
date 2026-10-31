/**
 * `use cache` uchun kesh ishlovchisi: Next'ning standart (xotiradagi) ishlovchisi + bitta tuzatish.
 *
 * Next 16.4.3 xatosi (16.5.0-canary.35 da ham): standart `set()` da `await pendingEntry`
 * try/finally'dan tashqarida. Kesh to'ldirish xato bilan tugasa (backend javob bermasa),
 * kalit "kutilmoqda" holatida qoladi va shu kalitni so'ragan har bir keyingi so'rov jarayon qayta
 * ishga tushguncha osilib qoladi — backend bir marta uzilsa, sahifalar ochilmay qolardi
 * (E2E: resilience.spec.ts; unit: src/lib/cache-handler.test.ts).
 *
 * Tuzatish: rad etilgan to'ldirish o'rniga saqlanmaydigan yozuv beriladi — standart kod o'z
 * try/finally'siga kiradi va kalitni bo'shatadi. Asl xato baribir sahifa renderiga yetadi (xato
 * sahifasi), keyingi so'rov esa backendga qaytadan murojaat qiladi.
 */
import defaultHandlers from "next/dist/server/lib/cache-handlers/default.js";

// Next'ning standart hajmi (`cacheMaxMemorySize`) — o'zgartirilsa, shu yerda ham
const MAX_MEMORY_BYTES = 50 * 1024 * 1024;

const handler = defaultHandlers.createDefaultCacheHandler(MAX_MEMORY_BYTES);

/** Saqlanmaydigan yozuv: production'da `expire: 0` o'tkazib yuboriladi, dev'da oqim xatosi */
function unstorableEntry(reason) {
  return {
    value: new ReadableStream({ start: (controller) => controller.error(reason) }),
    tags: [],
    stale: 0,
    timestamp: Date.now(),
    expire: 0,
    revalidate: 0,
  };
}

const cacheHandler = {
  ...handler,
  set(cacheKey, pendingEntry) {
    return handler.set(
      cacheKey,
      pendingEntry.catch((reason) => unstorableEntry(reason)),
    );
  },
};

export default cacheHandler;
