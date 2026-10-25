import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoA11yViolations(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  );
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
}

test.describe("Statik sahifalar", () => {
  for (const [path, heading] of [
    ["/haqida", "Biz haqimizda"],
    ["/aloqa", "Aloqa"],
    ["/biznes-qoshish", "Biznesingizni qoʻshing"],
    ["/shartlar", "Foydalanish shartlari"],
    ["/maxfiylik", "Maxfiylik siyosati"],
    ["/ru/shartlar", "Условия использования"],
  ] as const) {
    test(`${path}: sarlavha va accessibility`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expectNoA11yViolations(page);
    });
  }

  test("huquqiy matn loyiha sifatida belgilangan, mundarija bo'limga olib boradi", async ({
    page,
  }) => {
    await page.goto("/maxfiylik");
    await expect(
      page.getByText(/Loyiha matni: platforma ishga tushirilishidan oldin/),
    ).toBeVisible();
    await page.getByRole("link", { name: "6. Cookie fayllari" }).click();
    await expect(page).toHaveURL(/#cookie$/);
    await expect(page.getByRole("heading", { name: "6. Cookie fayllari" })).toBeInViewport();
  });

  test("footer barcha statik sahifalarga olib boradi", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("navigation", { name: "Qoʻshimcha havolalar" });
    for (const name of [
      "Biz haqimizda",
      "Biznesingizni qoʻshing",
      "Aloqa",
      "Foydalanish shartlari",
      "Maxfiylik siyosati",
    ]) {
      await expect(footer.getByRole("link", { name })).toBeVisible();
    }
    await footer.getByRole("link", { name: "Aloqa" }).click();
    await expect(page).toHaveURL(/\/aloqa$/);
  });
});

test.describe("Biznesingizni qo'shing", () => {
  test("tekshiruv xabarlari → yuborish → so'rov admin panelida", async ({ page }, testInfo) => {
    const name = `E2E forma ${testInfo.project.name}${Date.now().toString().slice(-6)}`;
    await page.goto("/biznes-qoshish");
    await page.getByRole("button", { name: "Yuborish" }).click();
    await expect(page.getByText("Biznes nomini kiriting (kamida 2 belgi)")).toBeVisible();
    await expect(page.getByText("Bogʻlanishimiz uchun rozilik kerak")).toBeVisible();
    await expect(page.getByLabel("Biznes nomi")).toBeFocused();

    await page.getByLabel("Biznes nomi").fill(name);
    await page.getByLabel("Nima bilan shugʻullanadi (ixtiyoriy)").fill("Kalit yasash");
    await page.getByLabel("Ismingiz").fill("Sinov");
    await page.getByLabel("Telefon raqamingiz").fill("90 000 00 07");
    await page.getByLabel(/Ismim va telefon raqamim/).check();
    await page.getByRole("button", { name: "Yuborish" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Rahmat!" })).toBeVisible();

    await page.goto("/admin/kirish");
    await page.getByLabel("Login").fill("root");
    await page.getByLabel("Parol").fill("yaqin-demo");
    await page.getByRole("button", { name: "Davom etish" }).click();
    await page.getByLabel("Kod").fill("123456");
    await page.getByRole("button", { name: "Kirish" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/sorovlar");
    const card = page.locator("article").filter({ hasText: name });
    await expect(card).toContainText("Kalit yasash");
    await expect(card).toContainText("+998 90 000 00 07");
  });
});

test.describe("SEO", () => {
  test("canonical, hreflang, Open Graph va WebSite JSON-LD", async ({ page }) => {
    await page.goto("/ru/kategoriyalar");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/ru\/kategoriyalar$/,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="uz"]')).toHaveAttribute(
      "href",
      /[^u]\/kategoriyalar$/,
    );
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "ru_RU");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/ru\/opengraph-image$/,
    );

    await page.goto("/");
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(jsonLd ?? "{}")).toMatchObject({ "@type": "WebSite", name: "Yaqin" });
  });

  test("demo rejimda indekslash yopiq; sitemap va OG rasm ishlaydi", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /");

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/biznes/ustoz-sartaroshxonasi</loc>");
    expect(sitemap).toContain('hreflang="ru"');
    expect(sitemap).not.toContain("/admin");

    const image = await request.get("/opengraph-image");
    expect(image.headers()["content-type"]).toBe("image/png");
  });
});
