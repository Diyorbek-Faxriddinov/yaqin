import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoA11yViolations(page: Page, exclude: string[] = []) {
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]);
  for (const selector of exclude) builder = builder.exclude(selector);
  const results = await builder.analyze();
  expect(results.violations).toEqual([]);
}

const PROFILE = "/biznes/ustoz-sartaroshxonasi";

test.describe("Biznes profili", () => {
  test("asosiy ma'lumotlar, xizmatlar, ish vaqti, sharhlar", async ({ page }) => {
    await page.goto(PROFILE);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ustoz sartaroshxonasi");

    const breadcrumb = page.getByRole("navigation", { name: "Sahifa yoʻli" });
    await expect(breadcrumb.getByRole("link", { name: "Sartaroshxonalar" })).toBeVisible();

    // Faqat xizmatlar — sarlavha "Xizmatlar", narx ro'yxati ko'rinishida
    const prices = page.getByRole("region", { name: "Xizmatlar" });
    await expect(prices.getByRole("link", { name: "Erkaklar soch turmagi" })).toBeVisible();
    await expect(prices).toContainText(/\d[\d ]* soʻm/);
    // "-dan" qo'shimchasi so'zga qo'shib yoziladi: "89 000 soʻmdan"
    await expect(prices).toContainText("soʻmdan");
    await expect(prices).toContainText("40 daq");

    const hours = page.getByRole("region", { name: "Ish vaqti" });
    await expect(hours.getByRole("row")).toHaveCount(7);

    // Qulayliklar — ikonka va nomi bilan (demo: karta, Payme/Click, oldindan yozilish)
    const amenities = page.getByRole("list", { name: "Qulayliklar" });
    await expect(amenities.getByRole("listitem")).toHaveText([
      "Karta orqali toʻlov",
      "Payme, Click",
      "Oldindan yozilish",
    ]);

    // Barcha aloqa kanallari (asosiy tugmada faqat birinchi raqam)
    const contacts = page.getByRole("region", { name: "Aloqa" });
    await expect(contacts.getByRole("link").first()).toHaveAttribute("href", /^tel:\+998\d{9}$/);

    const reviews = page.getByRole("region", { name: "Sharhlar" });
    await expect(reviews.locator("article")).toHaveCount(5);
    await expect(reviews.getByRole("link", { name: "Barcha sharhlar (37)" })).toBeVisible();

    await expectNoA11yViolations(page, [".maplibregl-canvas-container"]);
  });

  test("bog'lanish: qo'ng'iroq va yo'l ko'rsatish havolalari", async ({ page }) => {
    await page.goto(PROFILE);
    await expect(page.getByRole("link", { name: /Qoʻngʻiroq qilish/ })).toHaveAttribute(
      "href",
      /^tel:\+998\d{9}$/,
    );
    await page.getByRole("button", { name: "Yoʻl koʻrsatish" }).click();
    await expect(page.getByRole("menuitem", { name: "Yandex Xaritada" })).toHaveAttribute(
      "href",
      /^https:\/\/yandex\.uz\/maps\/\?rtext=~41\.\d+,69\.\d+&rtt=auto$/,
    );
    await expect(page.getByRole("menuitem", { name: "Google Xaritada" })).toHaveAttribute(
      "href",
      /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=41\.\d+,69\.\d+$/,
    );
  });

  test("ko'rish statistikasi yuboriladi (shaxsiy ma'lumotsiz)", async ({ page }) => {
    const request = page.waitForRequest(
      (req) => req.url().endsWith("/api/v1/events") && req.method() === "POST",
    );
    await page.goto(PROFILE);
    const body = (await request).postDataJSON() as Record<string, unknown>;
    expect(body.type).toBe("profile_view");
    expect(Object.keys(body).sort()).toEqual(["businessId", "type"]);
  });

  test("qidiruv tizimlari uchun JSON-LD", async ({ page }) => {
    await page.goto(PROFILE);
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(json ?? "{}") as Record<string, unknown>;
    expect(data["@type"]).toBe("LocalBusiness");
    expect(data.name).toBe("Ustoz sartaroshxonasi");
  });

  test("kategoriyadagi kartadan profilga o'tish", async ({ page }) => {
    await page.goto("/kategoriya/sartaroshxonalar");
    await page.getByRole("link", { name: "Barber Bek" }).click();
    await expect(page).toHaveURL(/\/biznes\/barber-bek$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Barber Bek");
  });

  test("rus tilida", async ({ page }) => {
    await page.goto(`/ru${PROFILE}`);
    await expect(page.getByRole("region", { name: "Часы работы" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Позвонить/ })).toBeVisible();
  });
});

test.describe("Sharhlar va mahsulot sahifalari", () => {
  test("barcha sharhlar sahifasi", async ({ page }) => {
    await page.goto(`${PROFILE}/sharhlar`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Ustoz sartaroshxonasi — sharhlar",
    );
    await expect(page.locator("main article")).toHaveCount(20);
    await page.getByRole("link", { name: "Keyingi" }).click();
    await expect(page).toHaveURL(/sahifa=2/);
    await expect(page.locator("main article")).toHaveCount(17);
  });

  test("xizmat sahifasi", async ({ page }) => {
    await page.goto(PROFILE);
    await page.getByRole("link", { name: "Erkaklar soch turmagi" }).click();
    await expect(page).toHaveURL(/\/biznes\/ustoz-sartaroshxonasi\/erkaklar-soch-turmagi$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Erkaklar soch turmagi");
    await expect(page.getByRole("region", { name: "Tafsilotlar" })).toContainText("40 daq");
    await expectNoA11yViolations(page);
    await page.getByRole("link", { name: "Ustoz sartaroshxonasi sahifasiga qaytish" }).click();
    await expect(page).toHaveURL(new RegExp(`${PROFILE}$`));
  });
});

test.describe("Xarita", () => {
  test("ro'yxatdan tanlash: karta va URL", async ({ page }, testInfo) => {
    await page.goto("/xarita?kategoriya=gozallik");
    await expect(page.getByRole("region", { name: "Bizneslar xaritasi" })).toBeAttached();

    if (testInfo.project.name === "mobile") {
      await page.getByRole("button", { name: "Roʻyxat" }).click();
    }
    await expect(page.getByRole("status").filter({ hasText: "joy" }).first()).toHaveText(
      "7 ta joy",
    );
    await page
      .getByRole("button", { name: /Guli goʻzallik saloni/ })
      .first()
      .click();
    await expect(page).toHaveURL(/b=guli-gozallik-saloni/);
    await page.getByRole("link", { name: "Batafsil" }).click();
    await expect(page).toHaveURL(/\/biznes\/guli-gozallik-saloni$/);
  });

  test("profildan katta xaritaga", async ({ page }) => {
    await page.goto(PROFILE);
    await page.getByRole("link", { name: "Katta xaritada ochish" }).click();
    await expect(page).toHaveURL(/\/xarita\?b=ustoz-sartaroshxonasi$/);
    await expect(page.getByRole("link", { name: "Batafsil" })).toBeVisible();
  });
});

test.describe("Do'kon katalogi", () => {
  test("mahsulotlar kartochkalarda; mahsulot sahifasida xususiyatlar tanlangan tilda", async ({
    page,
  }) => {
    await page.goto("/biznes/moda-kiyim-dokoni");
    const catalog = page.getByRole("region", { name: "Mahsulotlar" });
    // Bo'limlar va kartochkalar (rasm bo'lmasa — kategoriya ikonkasi)
    await expect(catalog.getByRole("heading", { name: "Erkaklar" })).toBeVisible();
    await expect(catalog.getByRole("listitem")).toHaveCount(3);
    await expect(catalog).toContainText("Oʻlcham: S, M, L, XL, 2XL");
    await expectNoA11yViolations(page, [".maplibregl-canvas-container"]);

    await catalog.getByRole("link", { name: "Erkaklar koʻylagi" }).click();
    await expect(page).toHaveURL(/\/biznes\/moda-kiyim-dokoni\/erkaklar-koylagi$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Erkaklar koʻylagi");
    const details = page.getByRole("region", { name: "Tafsilotlar" });
    await expect(details).toContainText("Mato");
    await expect(details).toContainText("Paxta");

    await page.goto("/ru/biznes/moda-kiyim-dokoni/erkaklar-koylagi");
    const detailsRu = page.getByRole("region", { name: "Подробности" });
    await expect(detailsRu).toContainText("Размер");
    await expect(detailsRu).toContainText("Материал");
    // Erkin xususiyat — admin kiritgan matn
    await expect(detailsRu).toContainText("Rang");
  });

  test("mahsulot nomi bilan qidiruv: natijada nima uchun topilgani", async ({ page }) => {
    await page.goto("/qidiruv?q=krossovka");
    const card = page.locator("main article").filter({ hasText: "Qadam poyabzal" });
    await expect(card).toContainText("Topildi: Krossovka");
  });
});
