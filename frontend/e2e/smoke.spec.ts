import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Asosiy tekshiruv", () => {
  test("bosh sahifa o'zbek tilida, prefikssiz ochiladi", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "uz");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("rus tili /ru prefiksi bilan ochiladi", async ({ page }) => {
    await page.goto("/ru");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Магазины и услуги рядом с вами",
    );
  });

  test("mavjud bo'lmagan sahifa 404 qaytaradi", async ({ page }) => {
    const response = await page.goto("/bunday-sahifa-yoq");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sahifa topilmadi");
  });

  test("dizayn ko'rgazmasi production'da yopiq", async ({ page }) => {
    const response = await page.goto("/dev/ui");
    expect(response?.status()).toBe(404);
  });

  test("gorizontal scroll yo'q", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("accessibility: jiddiy xatolar yo'q", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});
