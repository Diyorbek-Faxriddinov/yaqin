import { expect, test } from "@playwright/test";
import { isBackend } from "./support/backend";
import { signTelegram, stubLoginWidgets } from "./support/providers";

// Haqiqiy backend: frontend vidjet callback'i → backend imzoni bot tokeni bilan tekshiradi → sessiya.
// Telegram'ning o'z skripti va serveri o'rniga — shu algoritm bilan imzolangan sinov maʼlumoti.
test.describe("Telegram va Google orqali kirish", () => {
  test.skip(!isBackend, "Demo rejimda provayderlar o'chiq (mock imzoni tekshira olmaydi)");

  test("Telegram: imzolangan maʼlumot bilan kirish va profilga qaytish", async ({
    page,
  }, testInfo) => {
    const id = 900_000 + testInfo.workerIndex * 1000 + (Date.now() % 1000);
    const user = signTelegram({
      id,
      first_name: "Telegram",
      last_name: "Sinovchi",
      username: `tg_e2e_${id}`,
      auth_date: Math.floor(Date.now() / 1000),
    });
    await stubLoginWidgets(page, { telegram: user });
    await page.goto("/kirish?next=%2Fprofil");
    await page.getByRole("button", { name: "Telegram (sinov)" }).click();
    await expect(page).toHaveURL(/\/profil$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Telegram Sinovchi");
  });

  test("Telegram: soxta imzo rad etiladi", async ({ page }) => {
    const user = signTelegram(
      { id: 1, first_name: "Soxta", auth_date: Math.floor(Date.now() / 1000) },
      "boshqa-bot-tokeni",
    );
    await stubLoginWidgets(page, { telegram: user });
    await page.goto("/kirish");
    await page.getByRole("button", { name: "Telegram (sinov)" }).click();
    await expect(page.getByText("Kirib boʻlmadi. Qayta urinib koʻring.")).toBeVisible();
    await expect(page).toHaveURL(/\/kirish$/);
  });

  test("Google: tasdiqlanmagan ID token rad etiladi", async ({ page }) => {
    // Haqiqiy Google imzosini yaratib bo'lmaydi — frontend → backend yo'li va xato holati sinaladi
    await stubLoginWidgets(page, { googleCredential: "soxta.google.token" });
    await page.goto("/kirish");
    await page.getByRole("button", { name: "Google (sinov)" }).click();
    await expect(
      page.getByText(/Kirib boʻlmadi|Bu usul bilan kirish hozircha ishlamayapti/),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/kirish$/);
  });
});
