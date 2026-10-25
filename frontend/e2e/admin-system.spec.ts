import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Har bir test o'z yozuvlari bilan ishlaydi: noyob login, alohida qoralama biznes.
// Global sozlamalar (moderatsiya rejimi, so'rov formasi) o'zgartirilmaydi — parallel testlarga ta'sir qiladi.

async function adminLogin(page: Page, username = "root", password = "yaqin-demo") {
  await page.goto("/admin/kirish");
  await page.getByLabel("Login").fill(username);
  await page.getByLabel("Parol").fill(password);
  await page.getByRole("button", { name: "Davom etish" }).click();
  await page.getByLabel("Kod").fill("123456");
  await page.getByRole("button", { name: "Kirish" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

const tagOf = (testInfo: TestInfo) =>
  `${testInfo.project.name}${testInfo.repeatEachIndex}${Date.now().toString().slice(-6)}`;

async function expectNoA11yViolations(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running"),
  );
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
}

/** Telefonda navigatsiya menyuda — havolalarni menyuni ochib tekshiramiz */
async function navLinks(page: Page) {
  const menu = page.getByRole("button", { name: "Menyu" });
  if (await menu.isVisible()) await menu.click();
  return page.getByRole("navigation", { name: "Admin navigatsiyasi" }).last();
}

test.describe("Administratorlar", () => {
  test("Root administrator qo'shadi → u faqat rol ruxsatlari bilan kiradi → o'chirilsa chiqariladi", async ({
    page,
    browser,
  }, testInfo) => {
    const username = `e2e_${tagOf(testInfo)}`;
    await adminLogin(page);
    await page.goto("/admin/administratorlar");
    await expectNoA11yViolations(page);
    await page.getByRole("button", { name: "Administrator qoʻshish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Login").fill(username);
    await dialog.getByLabel("Ism").fill("E2E tahlilchi");
    await dialog.getByLabel("Tahlilchi").check();
    await dialog.getByRole("button", { name: "Qoʻshish" }).click();
    const password = (await page.getByTestId("temporary-password").textContent()) ?? "";
    expect(password.length).toBeGreaterThanOrEqual(12);
    await page.getByRole("button", { name: "Tayyor" }).click();

    const context = await browser.newContext();
    const other = await context.newPage();
    await adminLogin(other, username, password);
    const nav = await navLinks(other);
    await expect(nav.getByRole("link", { name: "Statistika" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Audit jurnali" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Administratorlar" })).toHaveCount(0);
    await other.goto("/admin/administratorlar");
    await expect(other).toHaveURL(/\/admin$/);

    const card = page.locator("article").filter({ hasText: username });
    await card.getByRole("button", { name: "Oʻchirish" }).click();
    await expect(page.getByText("Administrator oʻchirildi — sessiyalari tugatildi")).toBeVisible();
    await expect(card).toContainText("Oʻchirilgan");

    await other.goto("/admin/statistika");
    await expect(other).toHaveURL(/\/admin\/kirish/);
    await context.close();
  });

  test("rol qo'shish va o'chirish; moderatorga bo'lim yopiq", async ({
    page,
    browser,
  }, testInfo) => {
    const name = `E2E rol ${tagOf(testInfo)}`;
    await adminLogin(page);
    await page.goto("/admin/administratorlar?bolim=rollar");
    await page.getByRole("button", { name: "Rol qoʻshish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nomi", { exact: true }).fill(name);
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Kamida bitta ruxsat tanlang");
    await dialog.getByLabel("Shikoyatlar").check();
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    const card = page.locator("article").filter({ hasText: name });
    await expect(card).toContainText("Shikoyatlar");
    await expectNoA11yViolations(page);

    await card.getByRole("button", { name: "Oʻchirish" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Oʻchirish" }).click();
    await expect(page.getByText("Rol oʻchirildi")).toBeVisible();
    await expect(card).toHaveCount(0);

    const context = await browser.newContext();
    const moderator = await context.newPage();
    await adminLogin(moderator, "moderator");
    await moderator.goto("/admin/audit");
    await expect(moderator).toHaveURL(/\/admin$/);
    await context.close();
  });
});

test.describe("Audit va sozlamalar", () => {
  test("audit jurnalida kirish yozuvi; kontaktlar tekshiruvi", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/audit");
    await page.getByRole("button", { name: "Kirishlar" }).click();
    await expect(page.locator("article").first()).toContainText("kirdi");
    await expectNoA11yViolations(page);

    await page.goto("/admin/sozlamalar");
    await page.getByLabel("Telegram").fill("ab");
    await page.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByText("Lotin harflari, raqamlar va _ (5–32 belgi)")).toBeVisible();
    await page.getByLabel("Telegram").fill("");
    await page.getByLabel("Email").fill("info@example.com");
    await page.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByText("Sozlamalar saqlandi")).toBeVisible();
    await expectNoA11yViolations(page);

    const settings = (await (await page.request.get("/api/v1/settings")).json()) as {
      contacts: { email: string | null };
    };
    expect(settings.contacts.email).toBe("info@example.com");
  });
});

test.describe("Statistika va egasi hisoboti", () => {
  test("platforma statistikasi: grafik va jadval ko'rinishi", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/statistika");
    await expect(page.getByRole("img", { name: /Profil koʻrishlari: .* jami/ })).toBeVisible();
    await page.getByRole("button", { name: "7 kun" }).click();
    await page.getByRole("button", { name: "Jadval" }).click();
    await expect(page.locator("table").first().locator("tbody tr")).toHaveCount(7);
    await page.getByRole("button", { name: /Qoʻngʻiroqlar/ }).click();
    await expect(
      page.getByRole("heading", { name: "Qoʻngʻiroqlar — kunlar boʻyicha" }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("hisobot havolasi: egasi ochadi, bekor qilingach ochilmaydi", async ({
    page,
    browser,
  }, testInfo) => {
    await adminLogin(page);
    // Alohida qoralama — parallel testlar bir-birining havolasini bekor qilmasligi uchun
    const csrf = (await page.context().cookies()).find((c) => c.name === "csrftoken")?.value ?? "";
    const created = await page.request.post("/api/v1/admin/businesses", {
      data: {
        name: `E2E hisobot ${tagOf(testInfo)}`,
        categorySlug: "notarius",
        districtSlug: "bektemir",
      },
      headers: { "x-csrftoken": csrf },
    });
    expect(created.status()).toBe(201);
    const { id, name } = (await created.json()) as { id: string; name: string };

    await page.goto(`/admin/bizneslar/${id}?bolim=stats`);
    await page.getByRole("button", { name: "Havola yaratish" }).click();
    const url = (await page.getByTestId("report-url").textContent()) ?? "";
    expect(url).toMatch(/\/hisobot\/[A-Za-z0-9_-]{32,64}$/);

    const context = await browser.newContext();
    const owner = await context.newPage();
    await owner.goto(url);
    await expect(owner.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect(owner.getByText("Biznes hozir saytda koʻrinmayapti")).toBeVisible();
    await expect(owner.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expectNoA11yViolations(owner);

    await page.getByRole("button", { name: "Bekor qilish" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Bekor qilish" }).click();
    await expect(page.getByText("Havola bekor qilindi")).toBeVisible();
    await owner.reload();
    await expect(owner.getByRole("heading", { level: 1 })).toHaveText("Havola topilmadi");
    await context.close();
  });
});
