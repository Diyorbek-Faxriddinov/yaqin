import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { adminLogin } from "./support/admin";

// Har bir test o'z yozuvlari bilan ishlaydi (noyob belgi) — parallel ekranlar va boshqa testlar
// (masalan, Ustoz sartaroshxonasi sharhlari soni) bir-biriga xalaqit bermaydi.

/** Alohida brauzer kontekstidagi demo mijoz: API so'rovlari CSRF bilan */
async function customer(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const login = await page.request.post("/api/v1/auth/demo");
  expect(login.ok()).toBe(true);
  const csrf = (await context.cookies()).find((c) => c.name === "csrftoken")?.value ?? "";
  const send = async (method: "POST" | "PATCH", path: string, data: unknown) => {
    const response = await page.request.fetch(`/api/v1${path}`, {
      method,
      data,
      headers: { "x-csrftoken": csrf },
    });
    expect(response.ok(), `${method} ${path}`).toBe(true);
    return (await response.json()) as Record<string, unknown>;
  };
  return { context, page, send };
}

const tagOf = (testInfo: TestInfo) => `${testInfo.project.name}${Date.now().toString().slice(-7)}`;

async function expectNoA11yViolations(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  );
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
}

async function selectOption(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test.describe("Sharhlar moderatsiyasi", () => {
  test("chop etilgan sharh biznes sahifasida chiqadi", async ({ page, browser }, testInfo) => {
    const tag = tagOf(testInfo);
    const user = await customer(browser);
    await user.send("POST", "/businesses/lahza-foto-studiyasi/reviews", {
      rating: 5,
      text: `E2E sharh ${tag}`,
    });

    await adminLogin(page, "moderator");
    await page.goto("/admin/sharhlar");
    const card = page.locator("article").filter({ hasText: tag });
    await expect(card).toBeVisible();
    await expectNoA11yViolations(page);
    await card.getByRole("button", { name: "Chop etish" }).click();
    await expect(page.getByText("Sharh chop etildi")).toBeVisible();
    await expect(card).toBeHidden();

    await page.goto("/biznes/lahza-foto-studiyasi/sharhlar");
    await expect(page.getByText(`E2E sharh ${tag}`)).toBeVisible();
    await user.context.close();
  });

  test("rad etish sababi muallifga ko'rinadi", async ({ page, browser }, testInfo) => {
    const tag = tagOf(testInfo);
    const user = await customer(browser);
    await user.send("POST", "/businesses/ipak-yoli-sayohatlari/reviews", {
      rating: 1,
      text: `Reklama ${tag}`,
    });

    await adminLogin(page, "moderator");
    await page.goto("/admin/sharhlar");
    await page
      .locator("article")
      .filter({ hasText: tag })
      .getByRole("button", { name: "Rad etish" })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Rad etish" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Kamida 3 belgi yozing");
    await dialog.getByRole("button", { name: "Reklama yoki havola" }).click();
    await dialog.getByRole("button", { name: "Rad etish" }).click();
    await expect(page.getByText("Sharh rad etildi")).toBeVisible();

    await user.page.goto("/profil/sharhlar");
    await expect(user.page.locator("main article").first()).toContainText(
      "Sabab: Reklama yoki havola",
    );
    await user.context.close();
  });
});

test.describe("Shikoyatlar", () => {
  test("ko'rib chiqish va javob bilan yopish; moderator menyusi cheklangan", async ({
    page,
    browser,
  }, testInfo) => {
    const tag = tagOf(testInfo);
    const user = await customer(browser);
    const business = (await (
      await user.page.request.get("/api/v1/businesses/lahza-foto-studiyasi")
    ).json()) as { id: string };
    await user.send("POST", "/complaints", {
      businessId: business.id,
      reason: "wrong_info",
      text: `Telefon eskirgan ${tag}`,
    });

    await adminLogin(page, "moderator");
    // Moderator: sharh va shikoyat navbatlari bor, so'rovlar (telefonlar) va kategoriyalar yo'q
    await expect(page.getByRole("link", { name: /Moderatsiyadagi sharhlar/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Yangi soʻrovlar/ })).toHaveCount(0);

    await page.goto("/admin/shikoyatlar");
    const card = page.locator("article").filter({ hasText: tag });
    await card.getByRole("button", { name: "Koʻrib chiqishga olish" }).click();
    await expect(page.getByText("Koʻrib chiqishga olindi")).toBeVisible();

    await page.getByRole("button", { name: "Koʻrib chiqilmoqda" }).click();
    await expect(page).toHaveURL(/filtr=in_review/);
    await card.getByRole("button", { name: "Hal qilindi" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Rahmat! Maʼlumot yangilandi." }).click();
    await dialog.getByRole("button", { name: "Hal qilindi" }).click();
    await expect(page.getByText("Shikoyat yopildi")).toBeVisible();
    await expectNoA11yViolations(page);

    await user.page.goto("/profil/xabarlar");
    await expect(user.page.locator("main article").first()).toContainText(
      "Rahmat! Maʼlumot yangilandi.",
    );
    await user.context.close();
  });
});

test.describe("Biznes so'rovlari", () => {
  test("so'rovdan qoralama → usta joylashuv qadamidan davom etadi", async ({ page }, testInfo) => {
    const tag = tagOf(testInfo);
    const created = await page.request.post("/api/v1/business-requests", {
      data: {
        businessName: `E2E ustaxona ${tag}`,
        activity: "Tikuvchilik",
        districtSlug: "bektemir",
        address: "Demo koʻchasi, 5",
        contactName: "Test",
        phone: "+998001119999",
        agree: true,
      },
    });
    expect(created.status()).toBe(201);

    await adminLogin(page);
    await page.goto("/admin/sorovlar");
    const card = page.locator("article").filter({ hasText: tag });
    await expect(card.getByRole("link", { name: /\+998 00 111 99 99/ })).toHaveAttribute(
      "href",
      "tel:+998001119999",
    );
    await expectNoA11yViolations(page);
    await card.getByRole("button", { name: "Biznes yaratish" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Biznes nomi")).toHaveValue(`E2E ustaxona ${tag}`);
    await dialog.getByRole("button", { name: "Biznes yaratish" }).click();
    await expect(dialog.getByText("Kategoriyani tanlang").last()).toBeVisible();
    await selectOption(page, "Kategoriya", "Atelye va tikuvchilik");
    await dialog.getByRole("button", { name: "Biznes yaratish" }).click();

    await expect(page).toHaveURL(/\/admin\/bizneslar\/yangi\?id=[0-9a-f-]+&qadam=2$/);
    await expect(page.getByText("2/7-qadam")).toBeVisible();

    await page.goto("/admin/sorovlar?filtr=converted");
    await expect(
      page
        .locator("article")
        .filter({ hasText: tag })
        .getByRole("link", { name: "Biznesni ochish" }),
    ).toBeVisible();
  });
});

test.describe("Kategoriyalar", () => {
  test("ichki kategoriya, atribut va o'chirish", async ({ page }, testInfo) => {
    const tag = tagOf(testInfo);
    await adminLogin(page);
    await page.goto("/admin/kategoriyalar");
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Uy hayvonlari" }),
    });
    await section.getByRole("button", { name: "Ichki kategoriya qoʻshish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nomi (oʻzbekcha)").fill(`E2E toifa ${tag}`);
    await dialog.getByLabel("Nomi (ruscha)").fill("E2E категория");
    await expect(dialog.getByLabel("Slug (URL)")).toHaveValue(`e2e-toifa-${tag}`);
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    const row = section.locator("li").filter({ hasText: `E2E toifa ${tag}` });
    await expect(row).toBeVisible();
    await expectNoA11yViolations(page);

    await row.getByRole("link", { name: /Atributlar/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `E2E toifa ${tag}: atributlar`,
    );
    await page.getByRole("button", { name: "Atribut qoʻshish" }).click();
    await dialog.getByLabel("Nomi (oʻzbekcha)").fill("Rang");
    await dialog.getByLabel("Nomi (ruscha)").fill("Цвет");
    await selectOption(page, "Turi", "Bitta variant");
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(dialog.getByText("Kamida 2 ta variant")).toBeVisible();
    for (const [index, [uz, ru]] of [
      ["Qora", "Чёрный"],
      ["Oq", "Белый"],
    ].entries()) {
      await dialog.getByRole("button", { name: "Variant qoʻshish" }).click();
      await dialog.getByLabel(`${index + 1}-variant (oʻzbekcha)`).fill(uz!);
      await dialog.getByLabel(`${index + 1}-variant (ruscha)`).fill(ru!);
    }
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Rang" })).toContainText("Qora, Oq");
    await expectNoA11yViolations(page);

    await page.getByRole("link", { name: "Kategoriyalar" }).first().click();
    await row.getByRole("button", { name: `E2E toifa ${tag} — oʻchirish` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Oʻchirish" }).click();
    await expect(page.getByText("Kategoriya oʻchirildi")).toBeVisible();
    await expect(row).toHaveCount(0);
  });

  test("katalog formasida kategoriya atributlari tavsiya qilinadi", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/bizneslar");
    await page.getByRole("searchbox", { name: "Nomi boʻyicha qidirish" }).fill("Oq tosh");
    await page.getByRole("link", { name: /Oq tosh kafe/ }).click();
    await page.getByRole("tab", { name: "Narxlar" }).click();
    await page.getByRole("button", { name: "Qoʻshish" }).click();
    const suggestions = page.getByRole("group", { name: "Tavsiya etilgan xususiyatlar" });
    await suggestions.getByRole("button", { name: "Porsiya" }).click();
    await expect(page.getByRole("dialog").getByPlaceholder("g", { exact: true })).toBeVisible();
    await expect(suggestions.getByRole("button", { name: "Porsiya" })).toHaveCount(0);
  });
});

test.describe("Foydalanuvchilar", () => {
  test("bloklangan foydalanuvchi tizimdan chiqariladi", async ({ page, browser }, testInfo) => {
    const tag = tagOf(testInfo);
    const user = await customer(browser);
    await user.send("PATCH", "/me", { displayName: `E2E ${tag}` });

    await adminLogin(page);
    await page.goto("/admin/foydalanuvchilar");
    await page.getByRole("searchbox", { name: "Ism boʻyicha qidirish" }).fill(tag);
    const card = page.locator("article").filter({ hasText: tag });
    await expect(card).toHaveCount(1);
    await expectNoA11yViolations(page);
    await card.getByRole("button", { name: "Bloklash" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Spam" }).click();
    await dialog.getByRole("button", { name: "Bloklash" }).click();
    await expect(card).toContainText("Bloklangan");
    await expect(card).toContainText("Sabab: Spam");

    await user.page.goto("/profil");
    await expect(user.page).toHaveURL(/\/kirish\?next=%2Fprofil$/);
    await user.context.close();
  });
});
