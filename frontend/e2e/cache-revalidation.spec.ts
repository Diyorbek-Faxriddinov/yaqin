import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { adminLogin } from "./support/admin";

/**
 * Admin amalidan keyin ommaviy sahifa darhol yangilanadi (kesh teglari, handoff 6-bo'lim):
 * backend rejimida — backend frontendning /api/revalidate webhook'ini chaqiradi; demo'da — mock
 * sarlavhasi orqali. Sahifalar oldindan ochilib keshga tushiriladi, keyin o'zgarish kutiladi.
 */

const NOT_FOUND = "Sahifa topilmadi";

/**
 * Sahifani qayta yuklab, holat paydo bo'lguncha kutadi (15 soniyagacha). Odatda darhol; lekin
 * yangilanishdan oldin boshlangan render kechikib eski maʼlumotni yozsa, frontend yangilashni
 * 3 soniyadan keyin takrorlaydi (lib/revalidate-tags.ts) — yuklama ostida shu kerak bo'ladi.
 */
async function eventually(page: Page, path: string, check: () => Promise<void>) {
  await expect(async () => {
    await page.goto(path);
    await check();
  }).toPass({ timeout: 15_000 });
}

const tagOf = (testInfo: TestInfo) =>
  `${testInfo.project.name}${testInfo.workerIndex}${Date.now().toString().slice(-6)}`;

/** Admin sessiyasi bilan API so'rovi (CSRF sarlavhasi cookie'dan) */
async function adminApi(page: Page) {
  await adminLogin(page);
  const csrf = (await page.context().cookies()).find((c) => c.name === "csrftoken")?.value ?? "";
  return async (method: string, path: string, data?: unknown) => {
    const response = await page.request.fetch(`/api/v1${path}`, {
      method,
      data,
      headers: { "x-csrftoken": csrf },
    });
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBe(true);
    return response.status() === 204 ? null : ((await response.json()) as Record<string, unknown>);
  };
}

test.describe("Admin o'zgarishidan keyin ommaviy sahifa yangilanadi", () => {
  test("biznes e'lon qilinadi → ko'rinadi; yashiriladi → yo'qoladi", async ({ page }, testInfo) => {
    const api = await adminApi(page);
    const name = `Kesh sinovi ${tagOf(testInfo)}`;
    const created = await api("POST", "/admin/businesses", {
      name,
      // Boshqa testlar sanaydigan kategoriya/tumanlarga (go'zallik, Chilonzor...) tushmasin
      categorySlug: "notarius",
      districtSlug: "bektemir",
    });
    const slug = String(created?.slug);
    // Qoralama — sahifa yo'q (bu javob ham keshga tushishi mumkin). Status emas, mazmun
    // tekshiriladi: Next 16 oqimli renderda notFound() ba'zan 200 + noindex bilan keladi
    await page.goto(`/biznes/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(NOT_FOUND);

    await api("PATCH", `/admin/businesses/${String(created?.id)}`, {
      status: "published",
      location: { lat: 41.2105, lng: 69.3341 },
      address: { text: "Kesh koʻchasi, 1", landmark: null },
      consent: { givenBy: "Sinov egasi", givenAt: new Date().toISOString(), note: null },
    });
    const heading = page.getByRole("heading", { level: 1 });
    await eventually(page, `/biznes/${slug}`, () =>
      expect(heading).toHaveText(name, { timeout: 1000 }),
    );

    await api("PATCH", `/admin/businesses/${String(created?.id)}`, { status: "hidden" });
    await eventually(page, `/biznes/${slug}`, () =>
      expect(heading).toHaveText(NOT_FOUND, { timeout: 1000 }),
    );
  });

  test("ichki kategoriya qo'shiladi → kategoriyalar sahifasida; o'chiriladi → yo'q", async ({
    page,
  }, testInfo) => {
    const api = await adminApi(page);
    await page.goto("/kategoriyalar");
    const categories = (await api("GET", "/admin/categories")) as unknown as Array<{
      id: string;
      slug: string;
      parentId: string | null;
    }>;
    const parent = categories.find((c) => c.slug === "uy-hayvonlari");
    const tag = tagOf(testInfo);
    const created = await api("POST", "/admin/categories", {
      slug: `kesh-toifa-${tag}`,
      name: { uz: `Kesh toifa ${tag}`, ru: `Кеш ${tag}` },
      parentId: parent?.id,
    });

    const link = page.getByRole("link", { name: `Kesh toifa ${tag}` });
    await eventually(page, "/kategoriyalar", () => expect(link).toBeVisible({ timeout: 1000 }));

    await api("DELETE", `/admin/categories/${String(created?.id)}`);
    await eventually(page, "/kategoriyalar", () => expect(link).toHaveCount(0, { timeout: 1000 }));
  });

  test("sozlamalardagi kontakt → Aloqa sahifasida", async ({ page }) => {
    const api = await adminApi(page);
    await page.goto("/aloqa");
    const current = (await api("GET", "/admin/settings")) as {
      reviewsPremoderation: boolean;
      businessRequestsOpen: boolean;
      contacts: Record<string, string | null>;
    };
    // Boshqa testlar bilan bir xil qiymat — parallel testlar bir-biriga xalaqit bermaydi
    await api("PUT", "/admin/settings", {
      ...current,
      contacts: { ...current.contacts, email: "info@example.com" },
    });
    const email = page.getByRole("link", { name: "info@example.com" });
    await eventually(page, "/aloqa", () => expect(email).toBeVisible({ timeout: 1000 }));
  });
});
