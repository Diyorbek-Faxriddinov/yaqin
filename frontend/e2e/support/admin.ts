import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { authFile, E2E_PASSWORD, isBackend, totpCode, type E2EAdmin } from "./backend";

/**
 * Admin sifatida kirib, `next` sahifasini ochadi.
 *
 * - Demo: kirish formasi orqali (mock kodi — 123456).
 * - Backend: setup project (backend.setup.ts) haqiqiy TOTP bilan bir marta kirgan sessiya
 *   cookie'lari ulanadi. Sababi — backend bir kodni qayta qabul qilmaydi, parallel testlar esa bir
 *   30 soniyalik oynada kiradi. Kirish formasining o'zi backendda alohida testlarda sinaladi
 *   (noto'g'ri kod, yangi administratorning birinchi kirishi).
 */
export async function adminLogin(page: Page, username: E2EAdmin = "root", next = "/admin") {
  if (isBackend) {
    const state = JSON.parse(readFileSync(authFile(username), "utf8")) as {
      cookies: Parameters<ReturnType<Page["context"]>["addCookies"]>[0];
    };
    await page.context().addCookies(state.cookies);
    await page.goto(next);
  } else {
    await page.goto(`/admin/kirish?next=${encodeURIComponent(next)}`);
    await page.getByLabel("Login").fill(username);
    await page.getByLabel("Parol").fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Davom etish" }).click();
    await page.getByLabel("Kod").fill("123456");
    await page.getByRole("button", { name: "Kirish" }).click();
  }
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, "\\/")}$`));
}

/**
 * 2FA sozlash oynasidagi kod: backendda — sahifada ko'rsatilgan kalitdan (autentifikator ilova
 * qiladigan ish), demo'da — mock kodi.
 */
export async function setupCode(page: Page): Promise<string> {
  if (!isBackend) return "123456";
  const secret = (await page.locator("code").first().textContent())?.trim() ?? "";
  return totpCode(secret);
}
