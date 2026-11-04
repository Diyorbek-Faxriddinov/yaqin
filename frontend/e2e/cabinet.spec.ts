import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { solidPng } from "./fixtures/png";
import { isBackend } from "./support/backend";
import { createOwnerInvite, type OwnerInvite } from "./support/cabinet";
import { stubLoginWidgets } from "./support/providers";

const PNG = solidPng();

// Biznesda ko'pi bilan 3 ega: har ekran (project) va test o'z biznesida — parallel ishlaganda ham
const SLUGS: Record<string, string[]> = {
  mobile: ["tandir-uyi", "shirin-qandolatxonasi", "tungi-lavash"],
  tablet: ["quvur-ustasi", "chaqmoq-elektrik", "sovutgich-tamiri"],
  desktop: ["pok-uy-tozalash", "tez-yuk-tashish", "nozik-atelye"],
};
const slugFor = (testInfo: TestInfo, index: number) => SLUGS[testInfo.project.name]![index]!;

test.beforeEach(async ({ page }) => {
  if (isBackend) await stubLoginWidgets(page);
});

async function loginDemo(page: Page) {
  await page.goto("/kirish?next=%2Fprofil");
  await page.getByRole("button", { name: "Demo foydalanuvchi sifatida kirish" }).click();
  await expect(page).toHaveURL(/\/profil$/);
}

async function acceptInvite(page: Page, invite: OwnerInvite) {
  await page.goto(`/kabinet/qoshilish#${invite.token}`);
  await page.getByRole("button", { name: "Taklifni qabul qilish" }).click();
  await expect(page).toHaveURL(new RegExp(`/kabinet/${invite.businessId}$`));
  await expect(page.getByRole("heading", { level: 1, name: invite.name })).toBeVisible();
}

const toast = (page: Page) => page.getByText("Tasdiqlashga yuborildi");

test.describe("Biznes egasi kabineti", () => {
  test("taklif havolasi → profil taklifi → takliflarim → qaytarib olish", async ({
    page,
    baseURL,
  }, testInfo) => {
    const invite = await createOwnerInvite(baseURL!, slugFor(testInfo, 0));
    await loginDemo(page);

    await page.goto(`/kabinet/qoshilish#${invite.token}`);
    await expect(
      page.getByRole("heading", { name: "Biznes egasi sifatida qoʻshilish" }),
    ).toBeVisible();
    // Token manzildan darhol o'chiriladi (tarixda va ekran rasmlarida qolmaydi)
    await expect.poll(() => new URL(page.url()).hash).toBe("");
    await page.getByRole("button", { name: "Taklifni qabul qilish" }).click();
    await expect(page).toHaveURL(new RegExp(`/kabinet/${invite.businessId}$`));
    await expect(page.getByRole("heading", { level: 1, name: invite.name })).toBeVisible();

    // Forma — admin paneldagi bilan bir xil, tugma — "Tasdiqlashga yuborish"
    await page.getByLabel("Tavsif (ixtiyoriy)").fill("Egasi yozgan yangi tavsif");
    await page.getByRole("button", { name: "Tasdiqlashga yuborish" }).click();
    await expect(toast(page)).toBeVisible();
    await expect(page.getByText("1 ta taklifingiz tekshiruvda")).toBeVisible();

    // Aloqa bo'limida rozilik qismi yo'q (u admin qayd etadigan maʼlumot)
    await page.getByRole("tab", { name: "Aloqa" }).click();
    await expect(page.getByLabel("Telegram")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Egasining roziligi" })).toHaveCount(0);

    await page.getByRole("tab", { name: "Takliflarim" }).click();
    const card = page.getByRole("listitem").filter({ hasText: "Biznes maʼlumotlari" });
    await expect(card).toContainText("Tekshiruvda");
    await expect(card).toContainText("Oʻzgargan: Tavsif");

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);

    await card.getByRole("button", { name: "Qaytarib olish" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Qaytarib olish" }).click();
    await expect(card).toContainText("Qaytarib olindi");
    await expect(card.getByRole("button", { name: "Qaytarib olish" })).toHaveCount(0);

    // Kabinetga yo'l: profil sahifasida (telefonda header menyusi yo'q)
    await page.goto("/profil");
    await page.getByRole("link", { name: "Biznes kabineti" }).click();
    await expect(page).toHaveURL(/\/kabinet$/);
    await expect(page.getByRole("link", { name: new RegExp(invite.name) })).toBeVisible();
  });

  test("kirilmagan holda havola: kirish → qaytish → qabul; noto'g'ri havola", async ({
    page,
    baseURL,
  }, testInfo) => {
    const invite = await createOwnerInvite(baseURL!, slugFor(testInfo, 1));
    await page.goto(`/kabinet/qoshilish#${invite.token}`);
    await page.getByRole("main").getByRole("link", { name: "Kirish" }).click();
    // Token /kirish?next= ga o'tmaydi — sahifa uni o'zi saqlab turadi
    await expect(page).toHaveURL(/\/kirish\?next=%2Fkabinet%2Fqoshilish$/);
    await page.getByRole("button", { name: "Demo foydalanuvchi sifatida kirish" }).click();
    await expect(page).toHaveURL(/\/kabinet\/qoshilish$/);
    await page.getByRole("button", { name: "Taklifni qabul qilish" }).click();
    await expect(page).toHaveURL(new RegExp(`/kabinet/${invite.businessId}$`));

    await page.goto(`/kabinet/qoshilish#${"x".repeat(43)}`);
    await page.getByRole("button", { name: "Taklifni qabul qilish" }).click();
    await expect(page.getByText("Havola notoʻgʻri, muddati oʻtgan")).toBeVisible();

    await page.goto("/kabinet/qoshilish");
    await expect(page.getByText("Havola toʻliq emas")).toBeVisible();

    // Egasi bo'lmagan biznes — 404 xabari
    await page.goto("/kabinet/00000000-0000-4000-8000-000000000000");
    await expect(page.getByText("Biznes topilmadi yoki siz uning egasi emassiz")).toBeVisible();
  });

  test("rasmlar va mahsulot takliflari", async ({ page, baseURL }, testInfo) => {
    const invite = await createOwnerInvite(baseURL!, slugFor(testInfo, 2));
    await loginDemo(page);
    await acceptInvite(page, invite);

    // Rasm darhol yuklanadi (saytda ko'rinmaydi), ro'yxat taklif bilan yuboriladi
    await page.getByRole("tab", { name: "Rasmlar" }).click();
    const submit = page.getByRole("button", { name: "Tasdiqlashga yuborish" });
    await expect(submit).toBeDisabled();
    await page
      .locator("#photo-input")
      .setInputFiles({ name: "dokon.png", mimeType: "image/png", buffer: PNG });
    await expect(page.getByText("Yangi", { exact: true })).toBeVisible();
    await submit.click();
    await expect(toast(page)).toBeVisible();

    // Mahsulot: mavjudligini o'zgartirish
    await page.getByRole("tab", { name: "Katalog" }).click();
    await page
      .getByRole("button", { name: /^Tahrirlash: / })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Hozir mavjud").click();
    await dialog.getByRole("button", { name: "Tasdiqlashga yuborish" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Tekshiruvda").first()).toBeVisible();

    await page.getByRole("tab", { name: "Takliflarim" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "Biznes rasmlari" })).toContainText(
      "Tekshiruvda",
    );
    await expect(
      page.getByRole("listitem").filter({ hasText: "Mahsulot oʻzgarishi" }),
    ).toContainText("Oʻzgargan: Mavjudligi");
  });
});
