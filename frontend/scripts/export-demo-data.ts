/**
 * ⚠ Demo maʼlumotlarni backend uchun eksport qilish — `backend/demo/demo-data.json`.
 *
 * Mock qatlam (src/mocks/fixtures) va backend'dagi `manage.py seed_demo` bir xil to'qib
 * chiqarilgan maʼlumotlardan foydalanadi: E2E testlar ikkala rejimda ham bir xil natija kutadi.
 * Fixture o'zgarsa, qayta ishga tushiring:
 *
 *   npx jiti scripts/export-demo-data.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { BASE_DATE, BUSINESSES } from "../src/mocks/fixtures/businesses";
import { CATEGORY_ATTRIBUTES } from "../src/mocks/fixtures/categories";
import { itemsFor } from "../src/mocks/fixtures/items";
import {
  SEED_COMPLAINTS,
  SEED_REQUESTS,
  SEED_REVIEWS,
  SEED_USERS,
} from "../src/mocks/fixtures/moderation";
import { reviewsFor } from "../src/mocks/fixtures/reviews";

const data = {
  warning: "To'qib chiqarilgan demo maʼlumotlar — faqat ishlab chiqish va E2E testlar uchun",
  generatedFrom: "frontend/src/mocks/fixtures (scripts/export-demo-data.ts)",
  businesses: BUSINESSES.map((business) => ({
    ...business,
    // Rasmlar fixture'da yo'q (mock xotirasidagi yuklashlar uchun maydon)
    items: itemsFor(business).map(({ photos: _photos, ...item }) => item),
    // Ommaviy sharhlar roʻyxati (mock'dagi kabi, eng ko'pi 150 ta); reyting — fixture'dagi qiymat
    reviews: reviewsFor(business, BASE_DATE),
  })),
  // Kategoriya slug'i → tavsiya etilgan atributlar (katalog formasidagi tayyor maydonlar)
  categoryAttributes: CATEGORY_ATTRIBUTES,
  users: SEED_USERS,
  moderationReviews: SEED_REVIEWS,
  complaints: SEED_COMPLAINTS,
  requests: SEED_REQUESTS,
};

const target = join(process.cwd(), "..", "backend", "demo", "demo-data.json");
writeFileSync(target, JSON.stringify(data, null, 1) + "\n");
console.log(`Yozildi: ${target} (${data.businesses.length} ta biznes)`);
