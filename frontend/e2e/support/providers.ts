import { createHash, createHmac } from "node:crypto";
import type { Page } from "@playwright/test";

/**
 * ⚠ E2E uchun Telegram va Google sozlamalari (faqat `yaqin_e2e` muhiti, playwright.config.ts va
 * scripts/e2e-backend.mjs bilan bir xil). Haqiqiy bot yoki client ID emas.
 */
export const E2E_TELEGRAM_BOT = "yaqin_e2e_bot";
export const E2E_TELEGRAM_BOT_TOKEN = "123456789:e2e-only-not-a-real-bot-token";
export const E2E_GOOGLE_CLIENT_ID = "e2e-only.apps.googleusercontent.com";

const TELEGRAM_SCRIPT = /https:\/\/telegram\.org\/js\/telegram-widget\.js/;
const GOOGLE_SCRIPT = /https:\/\/accounts\.google\.com\/gsi\/client/;

export type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  auth_date: number;
};

/** Telegram Login Widget imzosi — Telegram hujjatidagi algoritm (backend shu bilan tekshiradi) */
export function signTelegram(user: TelegramUser, token = E2E_TELEGRAM_BOT_TOKEN) {
  const checkString = Object.entries(user)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = createHash("sha256").update(token).digest();
  const hash = createHmac("sha256", secret).update(checkString).digest("hex");
  return { ...user, hash };
}

/**
 * Tashqi kirish skriptlarini almashtiradi: testlar internetga bog'liq bo'lmasin. Telegram — sinov
 * tugmasi (bosilganda berilgan maʼlumotni vidjet callback'iga uzatadi); Google — sinov tugmasi
 * (bosilganda berilgan ID tokenni GIS callback'iga uzatadi). Maʼlumot berilmasa — bo'sh skript.
 */
export async function stubLoginWidgets(
  page: Page,
  options: { telegram?: Record<string, unknown>; googleCredential?: string } = {},
) {
  const telegram = options.telegram
    ? `const button = document.createElement("button");
       button.type = "button";
       button.textContent = "Telegram (sinov)";
       button.onclick = () => window.__yaqinTelegramAuth(${JSON.stringify(options.telegram)});
       document.currentScript.after(button);`
    : "";
  await page.route(TELEGRAM_SCRIPT, (route) =>
    route.fulfill({ contentType: "text/javascript", body: telegram }),
  );

  const google = options.googleCredential
    ? `let callback;
       window.google = { accounts: { id: {
         initialize: (options) => { callback = options.callback; },
         renderButton: (element) => {
           const button = document.createElement("button");
           button.type = "button";
           button.textContent = "Google (sinov)";
           button.onclick = () => callback({ credential: ${JSON.stringify(options.googleCredential)} });
           element.append(button);
         },
       } } };`
    : `window.google = { accounts: { id: { initialize() {}, renderButton() {} } } };`;
  await page.route(GOOGLE_SCRIPT, (route) =>
    route.fulfill({ contentType: "text/javascript", body: google }),
  );
}
