import { expect, test, type TestInfo } from "@playwright/test";
import { adminLogin } from "./support/admin";

// Har ekran (project) o'z biznesida — parallel ishlaganda bir-biriga xalaqit bermaydi
const SLUGS: Record<string, string> = {
  mobile: "somsa-markazi",
  tablet: "lazzat-kafe",
  desktop: "baraka-choyxonasi",
};
const slugFor = (testInfo: TestInfo) => SLUGS[testInfo.project.name]!;
const LINK = "https://www.instagram.com/reel/yaqin-e2e/";

// Kesh yangilanishini kutish — standart 30 s yetmaydi
test.describe.configure({ timeout: 120_000 });

test("mahsulot havolasi: forma tekshiruvi → saytda tugma → bosilishi sanaladi", async ({
  page,
  context,
}, testInfo) => {
  const slug = slugFor(testInfo);
  const business = (await (await page.request.get(`/api/v1/businesses/${slug}`)).json()) as {
    id: string;
  };
  const name = `Havola sinovi ${testInfo.project.name}`;

  await adminLogin(page, "root", `/admin/bizneslar/${business.id}`);
  await page.getByRole("tab", { name: "Katalog" }).click();
  await page.getByRole("button", { name: "Qoʻshish" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nomi").fill(name);
  await dialog.getByLabel("Narx, soʻm").fill("25000");

  // Ruxsat etilmagan sayt — forma saqlamaydi
  const link = dialog.getByLabel("Batafsil havola (ixtiyoriy)");
  await link.fill("https://evil.example.com/pay");
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(
    dialog.getByText("Instagram, Telegram, YouTube, TikTok yoki Facebook havolasini kiriting"),
  ).toBeVisible();

  await link.fill(LINK);
  await dialog.getByRole("button", { name: "Saqlash" }).click();
  await expect(dialog).toBeHidden();

  // Ommaviy sahifa keshlanadi — tugma chiqquncha qayta ochiladi
  const button = page.getByRole("link", { name: /Instagramda koʻrish/ });
  await expect(async () => {
    await page.goto(`/biznes/${slug}`);
    await expect(button.first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 45_000 });

  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(button).toHaveAttribute("href", LINK);
  await expect(button).toHaveAttribute("target", "_blank");
  await expect(button).toHaveAttribute("rel", /noopener/);

  // Tashqi saytga chiqilmaydi; hodisa yuborilganini tekshiramiz
  await context.route("https://www.instagram.com/**", (route) => route.abort());
  const event = page.waitForRequest(
    (request) =>
      request.url().includes("/api/v1/events") && (request.postData() ?? "").includes("link_click"),
  );
  const popup = page.waitForEvent("popup");
  await button.click();
  const sent = await event;
  expect(JSON.parse(sent.postData() ?? "{}")).toEqual({
    type: "link_click",
    businessId: business.id,
  });
  await (await popup).close();
});
