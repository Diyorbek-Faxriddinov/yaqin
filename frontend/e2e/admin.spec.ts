import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { solidPng } from "./fixtures/png";
import { adminLogin } from "./support/admin";

const PNG = solidPng();

async function selectOption(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("Admin kirishi", () => {
  test("kirilmagan holda admin — kirish sahifasiga", async ({ page }) => {
    await page.goto("/admin/bizneslar");
    await expect(page).toHaveURL(/\/admin\/kirish\?next=%2Fadmin%2Fbizneslar$/);
    // Tugma jonlanguncha faolsiz; faollashish rang animatsiyasi o'rtasida kontrast o'lchanmasin
    await expect(page.getByRole("button", { name: "Davom etish" })).toBeEnabled();
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== "running"),
    );
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("noto'g'ri parol va noto'g'ri kod — tushunarli xabar", async ({ page }) => {
    await page.goto("/admin/kirish");
    // Mavjud bo'lmagan login: "root" ni xato urinishlar bilan bloklab, parallel testlarga
    // xalaqit bermaslik uchun (xabar baribir bir xil — login mavjudligi oshkor qilinmaydi)
    await page.getByLabel("Login").fill(`yoq-admin-${Date.now()}`);
    await page.getByLabel("Parol").fill("xato");
    await page.getByRole("button", { name: "Davom etish" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(
      "Login yoki parol notoʻgʻri",
    );

    await page.getByLabel("Login").fill("root");
    await page.getByLabel("Parol").fill("yaqin-demo");
    await page.getByRole("button", { name: "Davom etish" }).click();
    await page.getByLabel("Kod").fill("000000");
    await page.getByRole("button", { name: "Kirish" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Kod notoʻgʻri");
  });

  test("root: bosh panel va accessibility", async ({ page }) => {
    await adminLogin(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bosh panel");
    await expect(page.getByRole("link", { name: /Yangi biznes qoʻshish/ })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("moderator: tahrirlash ruxsati yo'q", async ({ page }) => {
    await adminLogin(page, "moderator");
    await expect(page.getByRole("link", { name: /Yangi biznes qoʻshish/ })).toHaveCount(0);
    await page.goto("/admin/bizneslar/yangi");
    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("Biznes qo'shish ustasi", () => {
  test.use({
    geolocation: { latitude: 41.2801, longitude: 69.2101 },
    permissions: ["geolocation"],
  });

  test("7 qadam → e'lon qilish → ommaviy saytda ko'rinadi", async ({ page }, testInfo) => {
    const suffix = `${testInfo.project.name}${Date.now() % 100000}`;
    // Testlar umumiy demo holatda parallel ishlaydi: e'lon qilinadigan biznes boshqa testlar
    // aniq hisoblarini tekshiradigan kategoriya/tumanlarga (go'zallik, Chilonzor...) tushmasin
    const name = `E2E notarial idora ${suffix}`;
    await adminLogin(page, "root", "/admin/bizneslar/yangi");

    // 1. Asosiy
    await page.getByLabel("Biznes nomi").fill(name);
    await selectOption(page, "Kategoriya", "Notariuslar");
    await selectOption(page, "Tuman", "Bektemir");
    await page.getByRole("button", { name: "Yaratish va davom etish" }).click();
    await expect(page.getByText("2/7-qadam")).toBeVisible();
    await expect(page).toHaveURL(/qadam=2/);

    // 2. Joylashuv (telefon GPS'i)
    await page.getByRole("button", { name: "Hozirgi joylashuvim" }).click();
    await expect(page.getByRole("status").filter({ hasText: "41.28010" })).toBeVisible();
    await page.getByLabel("Manzil").fill("Bektemir, Husayniy koʻchasi, 12-uy");
    await page.getByRole("button", { name: "Keyingi" }).click();
    await expect(page.getByText("3/7-qadam")).toBeVisible();

    // 3. Rasmlar (brauzerda siqiladi va yuklanadi)
    await page
      .locator("#photo-input")
      .setInputFiles({ name: "dokon.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("Muqova")).toBeVisible();
    await page.getByRole("button", { name: "Keyingi" }).click();

    // 4. Ish vaqti
    await page.getByRole("button", { name: "Har kuni 09–21" }).click();
    await page.getByRole("button", { name: "Keyingi" }).click();
    await expect(page.getByText("5/7-qadam")).toBeVisible();

    // 5. Aloqa va rozilik
    await page.getByPlaceholder("90 123 45 67").fill("90 123 45 67");
    await page.getByLabel("Kim rozilik berdi").fill("Egasi Aziz aka");
    await page.getByRole("button", { name: "Keyingi" }).click();
    await expect(page.getByText("6/7-qadam")).toBeVisible();

    // 6. Narxlar
    await page.getByRole("button", { name: "Qoʻshish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nomi", { exact: true }).fill("Ishonchnoma rasmiylashtirish");
    await dialog.getByLabel("Narx, soʻm").fill("50000");
    await dialog.getByLabel("Davomiyligi, daqiqa").fill("30");
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Ishonchnoma rasmiylashtirish")).toBeVisible();
    await page.getByRole("button", { name: "Keyingi" }).click();

    // 7. Holat → e'lon qilish
    await expect(page.getByText("7/7-qadam")).toBeVisible();
    await page.getByRole("button", { name: "Eʼlon qilish" }).click();
    await expect(page).toHaveURL(/\/admin\/bizneslar\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Eʼlon qilingan").first()).toBeVisible();

    // Ommaviy saytda
    const slug = `e2e-notarial-idora-${suffix}`;
    await page.goto(`/biznes/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect(page.getByRole("region", { name: "Narxlar" })).toContainText(
      "Ishonchnoma rasmiylashtirish",
    );
    await expect(page.getByRole("link", { name: /Qoʻngʻiroq qilish/ })).toHaveAttribute(
      "href",
      "tel:+998901234567",
    );
  });

  test("e'lon qilish majburiy maydonlarsiz mumkin emas", async ({ page }) => {
    await adminLogin(page, "root", "/admin/bizneslar/yangi");
    await page.getByLabel("Biznes nomi").fill(`Chala biznes ${Date.now() % 100000}`);
    await selectOption(page, "Kategoriya", "Kafelar");
    await selectOption(page, "Tuman", "Yunusobod");
    await page.getByRole("button", { name: "Yaratish va davom etish" }).click();
    await expect(page.getByText("2/7-qadam")).toBeVisible();
    const url = new URL(page.url());
    await page.goto(`/admin/bizneslar/yangi?id=${url.searchParams.get("id")}&qadam=7`);
    await expect(page.getByRole("button", { name: "Eʼlon qilish" })).toBeDisabled();
    await expect(page.getByText("Avval majburiy maydonlarni toʻldiring")).toBeVisible();
  });
});

test.describe("Bizneslarni tahrirlash", () => {
  test("ro'yxatdan topish va tavsifni saqlash", async ({ page }) => {
    await adminLogin(page, "root", "/admin/bizneslar");
    await page.getByLabel("Nomi boʻyicha qidirish").fill("Ustoz");
    await page.getByRole("link", { name: /Ustoz sartaroshxonasi/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ustoz sartaroshxonasi");
    await page.getByLabel("Tavsif (ixtiyoriy)").fill("Admin tomonidan yangilangan tavsif.");
    await page.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByText("Saqlandi")).toBeVisible();

    await page.getByRole("tab", { name: "Ish vaqti" }).click();
    await expect(page).toHaveURL(/bolim=hours/);
  });
});
