import { expect, test } from "@playwright/test";

test.describe("Sayt karkasi", () => {
  test("demo rejim ogohlantirishi ko'rinadi", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Demo rejim/)).toBeVisible();
  });

  test("pastki navigatsiya faqat telefonda, qidiruv qatori esa planshet va desktopda", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    const bottomNav = page.locator("nav.fixed");
    const search = page.getByRole("search");

    if (testInfo.project.name === "mobile") {
      await expect(bottomNav).toBeVisible();
      await expect(bottomNav.getByRole("link", { name: "Bosh sahifa" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(search).toBeHidden();
    } else {
      await expect(bottomNav).toBeHidden();
      await expect(search).toBeVisible();
    }
  });

  test("til almashtirgich joriy sahifani rus tilida ochadi", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Русский" }).click();
    await expect(page).toHaveURL(/\/ru$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Услуги рядом с вами");

    await page.getByRole("link", { name: "Oʻzbekcha" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "uz");
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test("qidiruv formasi /qidiruv ga so'rov bilan o'tadi", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Telefonda qidiruv pastki menyuda");
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Qidiruv" }).fill("sartarosh");
    await page.getByRole("button", { name: "Qidirish" }).click();
    await expect(page).toHaveURL(/\/qidiruv\?q=sartarosh$/);
  });

  test("klaviatura: birinchi Tab 'Asosiy tarkibga o'tish' havolasini ko'rsatadi", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Telefonda jismoniy klaviatura yo'q");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Asosiy tarkibga oʻtish" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
  });
});
