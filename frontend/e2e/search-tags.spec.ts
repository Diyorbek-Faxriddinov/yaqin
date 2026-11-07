import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { adminLogin } from "./support/admin";
import { isBackend } from "./support/backend";
import { createOwnerInvite } from "./support/cabinet";
import { stubLoginWidgets } from "./support/providers";

// Har ekran (project) va test o'z biznesida: boshqa testlar sanaydigan bizneslarga tegmaydi
const SLUGS: Record<string, string[]> = {
  mobile: ["bahor-toyxonasi", "kuch-sport-zali"],
  tablet: ["chorsu-mehmonxonasi", "ipak-yoli-sayohatlari"],
  desktop: ["aniq-diagnostika", "oila-klinikasi"],
};
const slugFor = (testInfo: TestInfo, index: number) => SLUGS[testInfo.project.name]![index]!;
const uniqueTag = (testInfo: TestInfo) => `qxteg${testInfo.project.name}${Date.now() % 1_000_000}`;

// Kesh yangilanishini kutish — standart 30 s yetmaydi
test.describe.configure({ timeout: 120_000 });

/** Qidiruv sahifasi keshlanadi: o'zgarish ko'ringuncha qayta ochiladi */
async function expectFound(page: Page, tag: string, businessName: string) {
  await expect(async () => {
    await page.goto(`/qidiruv?q=${encodeURIComponent(tag)}`);
    await expect(page.getByRole("heading", { name: businessName })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 45_000 });
}

test.describe("Qidiruv teglari", () => {
  test("admin teg qo'shadi → qidiruvda topiladi, saytda ko'rinmaydi", async ({
    page,
  }, testInfo) => {
    const slug = slugFor(testInfo, 0);
    const business = (await (await page.request.get(`/api/v1/businesses/${slug}`)).json()) as {
      id: string;
      name: string;
    };
    const tag = uniqueTag(testInfo);
    await adminLogin(page, "root", `/admin/bizneslar/${business.id}`);
    await page.getByRole("tab", { name: "Katalog" }).click();
    await page.getByRole("button", { name: "Qoʻshish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nomi").fill("Teg sinovi mahsuloti");
    await dialog.getByLabel("Narx, soʻm").fill("15000");

    const tags = dialog.getByLabel("Qidiruv teglari (ixtiyoriy)");
    await tags.fill(tag);
    await tags.press("Enter");
    // Enter dialogni yopmaydi va formani yubormaydi
    await expect(dialog.getByRole("button", { name: `${tag} tegini olib tashlash` })).toBeVisible();
    await dialog.getByRole("button", { name: "Saqlash" }).click();
    await expect(dialog).toBeHidden();

    await expectFound(page, tag, business.name);
    await expect(page.getByText("Teg sinovi mahsuloti")).toBeVisible();

    // Saytdagi sahifada teg yo'q
    await page.goto(`/biznes/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(business.name);
    await expect(page.getByText("Teg sinovi mahsuloti").first()).toBeVisible();
    expect(await page.content()).not.toContain(tag);
  });

  test("egasi teg taklif qiladi → moderator ko'radi → tasdiqdan keyin topiladi", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    const invite = await createOwnerInvite(baseURL!, slugFor(testInfo, 1));
    const tag = uniqueTag(testInfo);

    const context = await browser.newContext({ baseURL, locale: "uz-UZ" });
    const owner = await context.newPage();
    if (isBackend) await stubLoginWidgets(owner);
    await owner.goto("/kirish?next=%2Fprofil");
    await owner.getByRole("button", { name: "Demo foydalanuvchi sifatida kirish" }).click();
    await expect(owner).toHaveURL(/\/profil$/);
    await owner.goto(`/kabinet/qoshilish#${invite.token}`);
    await owner.getByRole("button", { name: "Taklifni qabul qilish" }).click();
    await expect(owner.getByRole("heading", { level: 1, name: invite.name })).toBeVisible();

    await owner.getByRole("tab", { name: "Katalog" }).click();
    await owner
      .getByRole("button", { name: /^Tahrirlash: / })
      .first()
      .click();
    const dialog = owner.getByRole("dialog");
    await dialog.getByLabel("Qidiruv teglari (ixtiyoriy)").fill(`${tag},`);
    await dialog.getByRole("button", { name: "Tasdiqlashga yuborish" }).click();
    await expect(dialog).toBeHidden();

    // Tasdiqlanmaguncha shu biznes topilmaydi. "Hech narsa topilmadi" emas: backend imlo xatosiga
    // chidamli, birinchi testning deyarli bir xil tegi boshqa biznesni topishi mumkin
    await owner.goto(`/qidiruv?q=${tag}`);
    await expect(owner.getByRole("status").filter({ hasText: "ta natija" })).toBeVisible();
    await expect(owner.getByRole("heading", { name: invite.name })).toHaveCount(0);

    await adminLogin(page, "root", "/admin/takliflar");
    await page
      .getByRole("link", { name: new RegExp(invite.name) })
      .first()
      .click();
    const field = page.getByRole("region", { name: "Qidiruv teglari" });
    await expect(field.getByText(tag)).toBeVisible();
    await page.getByRole("button", { name: "Tasdiqlash" }).click();
    await expect(page.getByText("Tasdiqlandi — oʻzgarish saytga chiqdi")).toBeVisible();

    await expectFound(owner, tag, invite.name);
    await context.close();
  });
});

test.describe("Yumshoq qidiruv", () => {
  test("ortiqcha so'z natijani bo'shatmaydi va bu ochiq aytiladi", async ({ page }) => {
    await page.goto(`/qidiruv?q=${encodeURIComponent("sartarosh qxqxqxqx")}`);
    await expect(page.getByText("Aniq mos natija topilmadi")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ustoz sartaroshxonasi" })).toBeVisible();

    await page.goto("/qidiruv?q=sartarosh");
    await expect(page.getByRole("heading", { name: "Ustoz sartaroshxonasi" })).toBeVisible();
    await expect(page.getByText("Aniq mos natija topilmadi")).toHaveCount(0);
  });
});
