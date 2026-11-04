import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { adminLogin } from "./support/admin";
import { isBackend } from "./support/backend";
import { stubLoginWidgets } from "./support/providers";

// Biznesda ko'pi bilan 3 ega: har ekran (project) va test o'z biznesida (cabinet.spec.ts dan boshqa)
const SLUGS: Record<string, string[]> = {
  mobile: ["toza-moyka", "gildirak-shinomontaj"],
  tablet: ["avto-detal", "til-olami"],
  desktop: ["bilim-oquv-markazi", "matematika-repetitori"],
};
const slugFor = (testInfo: TestInfo, index: number) => SLUGS[testInfo.project.name]![index]!;

// Ikki brauzer (admin va ega), kesh yangilanishini kutish — standart 30 s yetmaydi
test.describe.configure({ timeout: 120_000 });

async function businessOf(page: Page, slug: string) {
  const response = await page.request.get(`/api/v1/businesses/${slug}`);
  return (await response.json()) as { id: string; name: string };
}

/** Admin "Egalar" bo'limida havola yaratadi; havola sahifada bir marta ko'rinadi */
async function createInviteInUi(page: Page, businessId: string): Promise<string> {
  await adminLogin(page, "root", `/admin/bizneslar/${businessId}`);
  await page.getByRole("tab", { name: "Egalar" }).click();
  await expect(page.getByText("Hali ega ulanmagan")).toBeVisible();
  await page.getByRole("button", { name: "Havola yaratish" }).click();
  await expect(page.getByRole("img", { name: "Taklif havolasining QR kodi" })).toBeVisible();
  const url = (await page.getByTestId("owner-invite-url").textContent()) ?? "";
  expect(url).toMatch(/\/kabinet\/qoshilish#[A-Za-z0-9_-]{32,64}$/);
  return url;
}

/** Ega — alohida brauzer konteksti (admin sessiyasidan mustaqil) */
async function ownerPage(browser: Browser, baseURL: string, inviteUrl: string, name: string) {
  const context = await browser.newContext({
    baseURL,
    locale: "uz-UZ",
    timezoneId: "Asia/Tashkent",
  });
  const page = await context.newPage();
  if (isBackend) await stubLoginWidgets(page);
  await page.goto("/kirish?next=%2Fprofil");
  await page.getByRole("button", { name: "Demo foydalanuvchi sifatida kirish" }).click();
  await expect(page).toHaveURL(/\/profil$/);
  await page.goto(new URL(inviteUrl).pathname + new URL(inviteUrl).hash);
  await page.getByRole("button", { name: "Taklifni qabul qilish" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return page;
}

async function proposeDescription(owner: Page, description: string) {
  await owner.getByLabel("Tavsif (ixtiyoriy)").fill(description);
  await owner.getByRole("button", { name: "Tasdiqlashga yuborish" }).click();
  await expect(owner.getByText("Tasdiqlashga yuborildi")).toBeVisible();
}

/** Navbatdan shu biznes taklifini ochish */
async function openChange(page: Page, businessName: string) {
  await page.goto("/admin/takliflar");
  await page
    .getByRole("link", { name: new RegExp(businessName) })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/takliflar\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Biznes maʼlumotlari" })).toBeVisible();
}

test.describe("Egalar takliflari (admin)", () => {
  test("havola → ega taklifi → tasdiqlash → saytda va kabinetda", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    const slug = slugFor(testInfo, 0);
    const business = await businessOf(page, slug);
    const inviteUrl = await createInviteInUi(page, business.id);
    const owner = await ownerPage(browser, baseURL!, inviteUrl, business.name);
    const description = `Egasi tasdiqlatgan tavsif ${testInfo.project.name}`;
    await proposeDescription(owner, description);

    // Bosh panelda navbat soni, navbatda taklif
    await openChange(page, business.name);
    const field = page.getByRole("region", { name: "Tavsif" });
    await expect(field).toContainText("Hozir saytda");
    await expect(field.getByText(description)).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("button", { name: "Tasdiqlash" }).click();
    await expect(page.getByText("Tasdiqlandi — oʻzgarish saytga chiqdi")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/takliflar$/);

    // Ommaviy sahifada (kesh yangilanishi bir necha soniya olishi mumkin)
    await expect(async () => {
      await page.goto(`/biznes/${slug}`);
      await expect(page.getByText(description)).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });

    await owner.getByRole("tab", { name: "Takliflarim" }).click();
    await expect(
      owner.getByRole("listitem").filter({ hasText: "Biznes maʼlumotlari" }),
    ).toContainText("Tasdiqlandi");
    await owner.context().close();
  });

  test("rad etish sababi egaga ko'rinadi; egalikni bekor qilish", async ({
    page,
    browser,
    baseURL,
  }, testInfo) => {
    const business = await businessOf(page, slugFor(testInfo, 1));
    const inviteUrl = await createInviteInUi(page, business.id);
    const owner = await ownerPage(browser, baseURL!, inviteUrl, business.name);
    await proposeDescription(owner, "Tekshirib bo'lmaydigan tavsif");

    await openChange(page, business.name);
    await page.getByRole("button", { name: "Rad etish" }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Maʼlumot notoʻgʻri yoki tekshirib boʻlmadi" })
      .click();
    await dialog.getByRole("button", { name: "Rad etish" }).click();
    await expect(page.getByText("Rad etildi — sabab egaga koʻrinadi")).toBeVisible();

    await owner.getByRole("tab", { name: "Takliflarim" }).click();
    const card = owner.getByRole("listitem").filter({ hasText: "Biznes maʼlumotlari" });
    await expect(card).toContainText("Rad etildi");
    await expect(card).toContainText("Sabab: Maʼlumot notoʻgʻri yoki tekshirib boʻlmadi");

    // Egalar ro'yxati va egalikni bekor qilish
    await page.goto(`/admin/bizneslar/${business.id}?bolim=owners`);
    await expect(page.getByText("Egalar (1/3)")).toBeVisible();
    await page.getByRole("button", { name: /^Egalikni bekor qilish: / }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Egalikni bekor qilish" }).click();
    await expect(page.getByText("Hali ega ulanmagan")).toBeVisible();

    await owner.reload();
    await expect(owner.getByText("Biznes topilmadi yoki siz uning egasi emassiz")).toBeVisible();
    await owner.context().close();
  });
});
