import { expect, test, type Page } from "@playwright/test";
import { adminLogin } from "./support/admin";
import { isBackend } from "./support/backend";
import { stubLoginWidgets } from "./support/providers";

/**
 * Brauzer xavfsizlik sarlavhalari (ADR-0013): sarlavhalar bor va sahifalar CSP buzilishisiz
 * ishlaydi — xarita plitkalari, Telegram va Google vidjetlari, admin paneli (QR, rasmlar) bilan.
 */

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

async function watchCsp(page: Page) {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      window.__cspViolations?.push(`${event.violatedDirective} ← ${event.blockedURI}`);
    });
  });
  const console: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) console.push(message.text());
  });
  return async () => {
    const violations = await page.evaluate(() => window.__cspViolations ?? []);
    return [...violations, ...console];
  };
}

test.describe("Xavfsizlik sarlavhalari", () => {
  test.beforeEach(async ({ page }) => {
    if (isBackend) await stubLoginWidgets(page);
  });

  test("sahifalarda CSP, Permissions-Policy va iframe taqiqi", async ({ request }) => {
    for (const path of ["/", "/kirish", "/admin/kirish"]) {
      const headers = (await request.get(path)).headers();
      expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
      expect(headers["content-security-policy"], path).toContain("object-src 'none'");
      expect(headers["permissions-policy"], path).toContain("geolocation=(self)");
      expect(headers["x-frame-options"], path).toBe("DENY");
      expect(headers["x-content-type-options"], path).toBe("nosniff");
    }
  });

  test("ommaviy sahifalar va xarita — CSP buzilishisiz", async ({ page }) => {
    const violations = await watchCsp(page);
    for (const path of ["/", "/kategoriyalar", "/biznes/ustoz-sartaroshxonasi", "/kirish"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    }
    await page.goto("/xarita");
    // Xarita uslubi va plitkalari tashqi provayderdan (connect-src, img-src, worker-src)
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(await violations()).toEqual([]);
  });

  test("admin paneli va biznes qo'shish — CSP buzilishisiz", async ({ page }) => {
    const violations = await watchCsp(page);
    await adminLogin(page, "root", "/admin/bizneslar/yangi");
    await page.waitForLoadState("networkidle");
    await page.goto("/admin/statistika");
    await page.waitForLoadState("networkidle");
    expect(await violations()).toEqual([]);
  });
});
