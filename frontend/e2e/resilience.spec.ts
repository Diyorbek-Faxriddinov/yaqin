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

  test("admin panel: sessiya tekshiruvi javobsiz qolsa — xato sahifasi", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: "adminsessionid", value: "sinov", domain: "localhost", path: "/" },
    ]);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: ERROR_TITLE })).toBeVisible({ timeout: 15_000 });
  });
});
