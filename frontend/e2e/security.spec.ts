import { expect, test, type Page } from "@playwright/test";
import { adminLogin } from "./support/admin";
import { isBackend } from "./support/backend";
import { stubLoginWidgets } from "./support/providers";

/**
 * Brauzer xavfsizlik sarlavhalari (ADR-0013): sarlavhalar bor va sahifalar CSP buzilishisiz
 * ishlaydi — xarita plitkalari, Telegram va Google vidjetlari, admin paneli (QR, rasmlar) bilan.
 */

/**
 * Buzilishlar Node tomonida yig'iladi — sahifa almashganda yo'qolmaydi (oldin faqat oxirgi
 * sahifa hisobga olinardi). Ba'zilari sahifa yuklangandan keyin, kechiktirilgan modullarda sodir
 * bo'ladi (masalan, Zod eval tekshiruvi) — har sahifadan keyin biroz kutiladi (`visit`).
 */
async function watchCsp(page: Page) {
  const violations: string[] = [];
  await page.exposeBinding("__reportCsp", (_source, text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { __reportCsp: (text: string) => void }).__reportCsp(
        `${location.pathname}: ${event.violatedDirective} ← ${event.blockedURI}`,
      );
    });
  });
  page.on("console", (message) => {
    if (message.text().includes("Content Security Policy")) violations.push(message.text());
  });
  return violations;
}

// "networkidle" emas: xarita plitkalarni to'xtovsiz yuklaydi, tarmoq hech tinchimaydi
async function visit(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.waitForTimeout(1500);
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
      await visit(page, path);
    }
    await page.goto("/xarita");
    // Xarita uslubi va plitkalari tashqi provayderdan (connect-src, img-src, worker-src)
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await visit(page, "/xarita");
    expect(violations).toEqual([]);
  });

  test("admin paneli va biznes qo'shish — CSP buzilishisiz", async ({ page }) => {
    const violations = await watchCsp(page);
    await adminLogin(page, "root", "/admin/bizneslar/yangi");
    await visit(page, "/admin/bizneslar/yangi");
    await visit(page, "/admin/statistika");
    expect(violations).toEqual([]);
  });
});
