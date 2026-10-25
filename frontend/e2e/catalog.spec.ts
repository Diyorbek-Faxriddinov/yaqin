import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
}

const results = (page: Page) => page.getByRole("main").locator("article");

test.describe("Bosh sahifa", () => {
  test("kategoriyalar, yangi bizneslar va tumanlar ko'rinadi", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("doʻkon va xizmatlar");

    const categories = page.getByRole("region", { name: "Kategoriyalar" });
    await expect(categories.getByRole("link")).toHaveCount(13); // 12 ta + "Barcha kategoriyalar"
    await expect(
      page.getByRole("region", { name: "Yangi qoʻshilganlar" }).locator("article"),
    ).toHaveCount(8);
    await expect(
      page.getByRole("region", { name: "Tumanlar boʻyicha" }).getByRole("link"),
    ).toHaveCount(12);
    await expectNoA11yViolations(page);
  });

  test("kategoriyaga o'tish", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("region", { name: "Kategoriyalar" })
      .getByRole("link", { name: "Goʻzallik va parvarish" })
      .click();
    await expect(page).toHaveURL(/\/kategoriya\/gozallik$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Goʻzallik va parvarish");
  });
});

test.describe("Kategoriyalar", () => {
  test("barcha kategoriyalar sahifasi", async ({ page }) => {
    await page.goto("/kategoriyalar");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kategoriyalar");
    await expect(page.getByRole("link", { name: /Sartaroshxonalar/ })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("ota kategoriya ichki kategoriyalardagi bizneslarni ham ko'rsatadi", async ({ page }) => {
    await page.goto("/kategoriya/gozallik");
    await expect(page.getByRole("status").filter({ hasText: "natija" })).toHaveText("7 ta natija");
    await expect(results(page)).toHaveCount(7);
    await expectNoA11yViolations(page);
  });

  test("ichki kategoriya: sahifa yo'li va faol chip", async ({ page }) => {
    await page.goto("/kategoriya/sartaroshxonalar");
    const breadcrumb = page.getByRole("navigation", { name: "Sahifa yoʻli" });
    await expect(breadcrumb.getByRole("link", { name: "Goʻzallik va parvarish" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sartaroshxonalar", exact: true })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(results(page)).toHaveCount(3);
  });

  test("tuman filtri URL orqali", async ({ page }) => {
    await page.goto("/kategoriya/sartaroshxonalar?tuman=chilonzor");
    await expect(results(page)).toHaveCount(1);
    await expect(results(page).first()).toContainText("Chilonzor");
  });

  test("sahifalash", async ({ page }) => {
    await page.goto("/qidiruv");
    await expect(results(page)).toHaveCount(12);
    await page.getByRole("link", { name: "Keyingi" }).click();
    await expect(page).toHaveURL(/sahifa=2/);
    await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
  });

  test("mavjud bo'lmagan kategoriya — 404 sahifasi va noindex", async ({ page }) => {
    const response = await page.goto("/kategoriya/bunday-kategoriya-yoq");
    // Build'da ma'lum bo'lmagan slug: oqim boshlangan bo'lsa Next 200 qaytaradi, lekin
    // noindex qo'shadi (Next 16 hujjatlashtirilgan xatti-harakati). Ikkalasi ham to'g'ri.
    expect([200, 404]).toContain(response?.status());
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sahifa topilmadi");
    const robots = await page
      .locator('meta[name="robots"]')
      .evaluateAll((tags) => tags.map((tag) => tag.getAttribute("content") ?? ""));
    expect(robots.length).toBeGreaterThan(0);
    expect(robots.every((content) => content.includes("noindex"))).toBe(true);
  });

  test("rus tilida", async ({ page }) => {
    await page.goto("/ru/kategoriya/gozallik");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Красота и уход");
    await expect(page.getByRole("status").filter({ hasText: "результат" })).toHaveText(
      "7 результатов",
    );
  });
});

test.describe("Filtrlar", () => {
  test("desktop: tuman tanlanganda URL va natijalar yangilanadi", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Desktop filtrlar paneli");
    await page.goto("/kategoriya/gozallik");
    await page.getByRole("combobox", { name: "Tuman" }).click();
    await page.getByRole("option", { name: "Yunusobod" }).click();
    await expect(page).toHaveURL(/tuman=yunusobod/);
    await expect(results(page)).toHaveCount(2);
  });

  test("telefon: filtrlar pastdan ochiladigan oynada", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Telefon ko'rinishi");
    await page.goto("/kategoriya/gozallik");
    await page.getByRole("button", { name: /Filtrlar/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filtrlar" });
    await expect(sheet).toBeVisible();
    await sheet.getByRole("switch", { name: "Hozir ochiq" }).click();
    await expect(page).toHaveURL(/ochiq=1/);
    await sheet.getByRole("button", { name: "Natijalarni koʻrsatish" }).click();
    await expect(sheet).toBeHidden();
  });
});

test.describe("Qidiruv", () => {
  test("kirill yozuvida qidirish", async ({ page }) => {
    await page.goto(`/qidiruv?q=${encodeURIComponent("сартарош")}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "“сартарош” boʻyicha natijalar",
    );
    await expect(results(page)).toHaveCount(3);
    await expectNoA11yViolations(page);
  });

  test("natija bo'lmasa — tushunarli xabar va filtrlarni tozalash", async ({ page }) => {
    await page.goto("/qidiruv?q=zzzqqq");
    await expect(page.getByRole("heading", { name: "Hech narsa topilmadi" })).toBeVisible();
    await page.getByRole("link", { name: "Filtrlarni tozalash" }).click();
    await expect(page).toHaveURL(/\/qidiruv$/);
  });

  test("bosh sahifadagi qidiruv formasi", async ({ page }) => {
    await page.goto("/");
    await page.locator("#hero-search").fill("dorixona");
    await page.locator("#hero-search").press("Enter");
    await expect(page).toHaveURL(/\/qidiruv\?q=dorixona$/);
    await expect(results(page)).toHaveCount(2);
  });
});

test.describe("Joylashuv", () => {
  test.use({
    geolocation: { latitude: 41.2755, longitude: 69.2042 }, // Chilonzor
    permissions: ["geolocation"],
  });

  test("'Yaqin atrofimda' — masofa bo'yicha saralash va masofalar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Yaqin atrofimda" }).click();
    await expect(page).toHaveURL(/saralash=yaqin/);
    await expect(results(page).first()).toContainText(/\d+(,\d)?\s(m|km)/);
    // Eng yaqini — Chilonzordagi biznes
    await expect(results(page).first()).toContainText("Chilonzor");
  });
});
