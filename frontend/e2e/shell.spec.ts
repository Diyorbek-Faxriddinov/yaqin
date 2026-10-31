import { expect, test } from "@playwright/test";
import { isBackend } from "./support/backend";

test.describe("Sayt karkasi", () => {
  test("demo rejim ogohlantirishi faqat demo rejimda", async ({ page }) => {
    await page.goto("/");
    // Haqiqiy backend bilan ogohlantirish yo'q (mock maʼlumot ogohlantirishsiz ko'rinmaydi)
    await expect(page.getByText(/Demo rejim/)).toHaveCount(isBackend ? 0 : 1);
  });

  test("bir qismli manzillarni oldindan yuklash xatosiz (til almashtirgich)", async ({ page }) => {
    // Til almashtirgich Next `Link` bo'lganda Next `/ru` dan `/[locale]` qolipini o'rganib
    // ("optimistic routing"), `/haqida`, `/xarita` kabi manzillarni bosh sahifa deb taxmin qilardi va
    // mavjud bo'lmagan segmentni so'rab 404 olardi (language-switcher.tsx). Qolip o'rganilguncha
    // kutib, keyin footer havolalari ko'rinadigan qilinadi — ular shundagina oldindan yuklanadi.
    // Faqat bir qismli manzillar: parallel testlar biznes sahifalarini yangilayotganda ularning
    // prefetch'i vaqtincha 404 bo'lishi mumkin — bu boshqa (zararsiz) holat
    const failed: string[] = [];
    page.on("response", (response) => {
      const { pathname, search } = new URL(response.url());
      if (search.includes("_rsc=") && /^\/[^/]+$/.test(pathname) && response.status() >= 400) {
        failed.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(3000);
    await page.mouse.wheel(0, 20_000);
    await page.waitForTimeout(2500);
    expect(failed).toEqual([]);
  });

  test("pastki navigatsiya faqat telefonda, qidiruv qatori esa planshet va desktopda", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    // Oqimli render paytida Suspense fallback nusxasi qisqa vaqt DOMda (yashirin) turadi —
    // shuning uchun faqat ko'rinadiganlarini sanaymiz
    const bottomNav = page.locator("nav.fixed").filter({ visible: true });
    // Header'dagi qidiruv (bosh sahifada asosiy blokda ham forma bor)
    const search = page.getByRole("banner").getByRole("search");
    const headerNav = page
      .getByRole("banner")
      .getByRole("navigation", { name: "Asosiy navigatsiya" });

    if (testInfo.project.name === "mobile") {
      await expect(bottomNav).toHaveCount(1);
      await expect(bottomNav.getByRole("link", { name: "Bosh sahifa" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(search).toBeHidden();
      await expect(headerNav).toBeHidden();
    } else {
      await expect(bottomNav).toHaveCount(0);
      await expect(search).toBeVisible();
      // Planshetda ham kategoriyalar va xaritaga yo'l bo'lishi kerak
      await expect(headerNav.getByRole("link", { name: "Kategoriyalar" })).toBeVisible();
      await expect(headerNav.getByRole("link", { name: "Xarita" })).toBeVisible();
    }
  });

  test("til almashtirgich joriy sahifani rus tilida ochadi", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Русский" }).click();
    await expect(page).toHaveURL(/\/ru$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ru");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Магазины и услуги рядом с вами",
    );

    await page.getByRole("link", { name: "Oʻzbekcha" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "uz");
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test("qidiruv formasi /qidiruv ga so'rov bilan o'tadi", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Telefonda qidiruv pastki menyuda");
    await page.goto("/");
    const header = page.getByRole("banner");
    await header.getByRole("searchbox", { name: "Qidiruv" }).fill("sartarosh");
    await header.getByRole("button", { name: "Qidirish" }).click();
    await expect(page).toHaveURL(/\/qidiruv\?q=sartarosh$/);
  });

  test("klaviatura: birinchi Tab 'Asosiy tarkibga o'tish' havolasini ko'rsatadi", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "Telefonda jismoniy klaviatura yo'q");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Asosiy tarkibga oʻtish" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
  });
});
