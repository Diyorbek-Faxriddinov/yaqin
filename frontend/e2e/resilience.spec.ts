import { expect, test } from "@playwright/test";

/**
 * Backend javob bermasa (backend rejimi, "resilience" loyihasi): alohida Next.js server ulanishni
 * qabul qilib, hech qachon javob qaytarmaydigan "backend"ga ulangan, API_TIMEOUT_MS=1500.
 * Kutilgan: sahifa cheksiz kutmaydi — tushunarli xato va "qayta urinish"; build paytida
 * keshlangan sahifalar esa backendsiz ham ochiladi.
 */
const ERROR_TITLE = "Nimadir xato ketdi";

test.describe("Backend javob bermasa", () => {
  test("keshlangan bosh sahifa backendsiz ham ochiladi", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("banner").getByRole("link", { name: /Yaqin/ })).toBeVisible();
  });

  test("qidiruv: vaqt chegarasidan keyin tushunarli xato, cheksiz kutish yo'q", async ({
    page,
  }) => {
    const started = Date.now();
    await page.goto("/qidiruv?q=sartarosh");
    await expect(page.getByRole("heading", { name: ERROR_TITLE })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Qayta urinish" })).toBeVisible();
    expect(Date.now() - started).toBeLessThan(15_000);
  });

  test("rasm (next/image manbasi) javobsiz qolsa — cheksiz kutmaydi", async ({ request }) => {
    // Optimizator rasmni Next.js'ning o'zidan (/api/v1/media/...) so'raydi, u esa backenddan
    // oladi; vaqt chegarasisiz sahifadagi rasmlar va `load` hodisasi osilib qolardi
    const started = Date.now();
    const response = await request.get("/api/v1/media/businesses/x/rasm.webp", {
      timeout: 15_000,
    });
    expect(response.status()).toBe(503);
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  test("admin panel: sessiya tekshiruvi javobsiz qolsa — xato sahifasi", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "adminsessionid", value: "sinov", domain: "localhost", path: "/" },
    ]);
    // Foydalanuvchi ko'radigan natija tekshiriladi, `load` emas: parallel admin yuklashlarida HTML
    // oqimi xato sahifasidan keyin ba'zan ochiq qoladi (Next ichida; docs/progress.md, 4.6 ochiq masala)
    const started = Date.now();
    await page.goto("/admin", { waitUntil: "commit" });
    await expect(page.getByRole("heading", { name: ERROR_TITLE })).toBeVisible({ timeout: 15_000 });
    expect(Date.now() - started).toBeLessThan(15_000);
  });
});
