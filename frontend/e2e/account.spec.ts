import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PROFILE = "/biznes/ustoz-sartaroshxonasi";

/** Demo foydalanuvchi sifatida kirish va `next` sahifasiga qaytish */
async function loginDemo(page: Page, next = "/profil") {
  await page.goto(`/kirish?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: "Demo foydalanuvchi sifatida kirish" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?/]/g, "\\$&")}$`));
}

test.describe("Kirish va himoyalangan sahifalar", () => {
  test("kirilmagan holda profil — kirish sahifasiga, keyin qaytish", async ({ page }) => {
    await page.goto("/profil/sevimlilar");
    await expect(page).toHaveURL(/\/kirish\?next=%2Fprofil%2Fsevimlilar$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kirish");
    // Haqiqiy provayderlar demo rejimida faol emas
    await expect(page.getByRole("button", { name: "Telegram orqali kirish" })).toBeDisabled();

    await page.getByRole("button", { name: "Demo foydalanuvchi sifatida kirish" }).click();
    await expect(page).toHaveURL(/\/profil\/sevimlilar$/);
    await expect(page.getByRole("heading", { name: "Hali sevimlilar yoʻq" })).toBeVisible();
  });

  test("open redirect himoyasi: tashqi manzilga qaytmaydi", async ({ page }) => {
    await page.goto("/kirish?next=//evil.example.com");
    await page.getByRole("button", { name: "Demo foydalanuvchi sifatida kirish" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/profil$/);
  });

  test("kirish sahifasi accessibility", async ({ page }) => {
    await page.goto("/kirish");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("header: kirish → foydalanuvchi menyusi → chiqish", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Telefonda menyu pastki navigatsiyada");
    await page.goto("/kategoriyalar");
    await page.getByRole("banner").getByRole("link", { name: "Kirish" }).click();
    await expect(page).toHaveURL(/\/kirish\?next=%2Fkategoriyalar$/);
    await page.getByRole("button", { name: "Demo foydalanuvchi sifatida kirish" }).click();
    await expect(page).toHaveURL(/\/kategoriyalar$/);

    await page.getByRole("button", { name: "Foydalanuvchi menyusi" }).click();
    await page.getByRole("menuitem", { name: "Chiqish" }).click();
    await expect(page.getByRole("banner").getByRole("link", { name: "Kirish" })).toBeVisible();
  });
});

test.describe("Sevimlilar", () => {
  test("kirmasdan yurakcha — kirish sahifasiga", async ({ page }) => {
    await page.goto("/kategoriya/sartaroshxonalar");
    await page.getByRole("button", { name: /Barber Bek — sevimlilarga qoʻshish/ }).click();
    await expect(page).toHaveURL(/\/kirish\?next=%2Fkategoriya%2Fsartaroshxonalar$/);
  });

  test("qo'shish, ro'yxatda ko'rish va olib tashlash", async ({ page }) => {
    await loginDemo(page, "/kategoriya/sartaroshxonalar");
    const heart = page.getByRole("button", { name: /Barber Bek — sevimlilarga qoʻshish/ });
    await heart.click();
    await expect(
      page.getByRole("button", { name: /Barber Bek — sevimlilardan olib tashlash/ }),
    ).toHaveAttribute("aria-pressed", "true");

    await page.goto("/profil/sevimlilar");
    await expect(page.locator("main article")).toHaveCount(1);
    await page.getByRole("button", { name: /Barber Bek — sevimlilardan olib tashlash/ }).click();
    await expect(page.getByRole("heading", { name: "Hali sevimlilar yoʻq" })).toBeVisible();
  });
});

test.describe("Sharh va xabar", () => {
  test("sharh: validatsiya, yuborish, moderatsiya holati, takroriy sharh", async ({ page }) => {
    await loginDemo(page, PROFILE);
    await page.getByRole("button", { name: "Sharh yozish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Yuborish" }).click();
    await expect(dialog.getByText("Bahoni tanlang")).toBeVisible();

    await dialog.locator("label").filter({ hasText: "4 yulduz" }).click();
    await dialog.getByLabel("Sharh (ixtiyoriy)").fill("Yaxshi xizmat, tavsiya qilaman.");
    await dialog.getByRole("button", { name: "Yuborish" }).click();
    await expect(page.getByText("Rahmat! Sharhingiz moderatsiyadan soʻng chiqadi.")).toBeVisible();
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Sharh yozish" }).click();
    await dialog.locator("label").filter({ hasText: "5 yulduz" }).click();
    await dialog.getByRole("button", { name: "Yuborish" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(
      "Siz bu biznesga allaqachon sharh qoldirgansiz.",
    );

    await page.goto("/profil/sharhlar");
    const review = page.locator("main article").first();
    await expect(review).toContainText("Ustoz sartaroshxonasi");
    await expect(review).toContainText("Moderatsiyada");
  });

  test("xabar: 'Boshqa' uchun izoh majburiy, yuborish va holat", async ({ page }) => {
    await loginDemo(page, PROFILE);
    await page.getByRole("button", { name: "Maʼlumot notoʻgʻrimi? Xabar bering" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Boshqa").check();
    await dialog.getByRole("textbox").fill("qisqa");
    await dialog.getByRole("button", { name: "Yuborish" }).click();
    await expect(dialog.getByText("Iltimos, kamida 10 belgi yozing")).toBeVisible();

    await dialog.getByLabel("Narx, telefon yoki ish vaqti notoʻgʻri").check();
    await dialog.getByRole("button", { name: "Yuborish" }).click();
    await expect(page.getByText("Xabaringiz qabul qilindi. Rahmat!")).toBeVisible();

    await page.goto("/profil/xabarlar");
    await expect(page.locator("main article").first()).toContainText("Qabul qilindi");
  });
});

test.describe("Profil", () => {
  test("ismni o'zgartirish va accessibility", async ({ page }) => {
    await loginDemo(page);
    await page.getByLabel("Ismingiz").fill("Aziz");
    await page.getByRole("button", { name: "Saqlash" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Aziz");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("akkauntni o'chirish", async ({ page }) => {
    await loginDemo(page);
    await page.getByRole("button", { name: "Akkauntni oʻchirish" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Ha, oʻchirish" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await page.goto("/profil");
    await expect(page).toHaveURL(/\/kirish/);
  });
});
