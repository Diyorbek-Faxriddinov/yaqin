import type { Review } from "@/lib/api/types";
import type { DemoBusiness } from "./businesses";
import { demoId, seededRandom } from "./ids";

// ⚠ To'qib chiqarilgan demo sharhlar — haqiqiy foydalanuvchilar fikri emas.

const AUTHORS = [
  "Aziz T.",
  "Malika R.",
  "Jasur K.",
  "Dilnoza S.",
  "Bekzod A.",
  "Nilufar X.",
  "Sardor M.",
  "Gulnora Y.",
  "Otabek N.",
  "Madina Q.",
  "Shoxrux E.",
  "Zarina B.",
  "Ilhom D.",
  "Feruza O.",
];

const TEXTS: Record<"good" | "ok" | "bad", Array<string | null>> = {
  good: [
    "Juda yoqdi, xizmat tez va sifatli. Albatta yana kelaman.",
    "Xodimlar xushmuomala, narxlar ham maqbul.",
    "Hammasi aʼlo darajada, tavsiya qilaman!",
    "Uyimga yaqin, har doim shu yerga kelaman.",
    null,
  ],
  ok: [
    "Yomon emas, lekin navbat biroz uzun boʻldi.",
    "Umuman olganda yaxshi, narxlar biroz qimmatroq.",
    "Oʻrtacha. Ish vaqtini aniqroq yozib qoʻyishsa yaxshi boʻlardi.",
    null,
  ],
  bad: ["Kutganimdek boʻlmadi, uzoq kutishga toʻgʻri keldi.", "Aytilgan vaqtda ochiq emas edi."],
};

const REPLIES = [
  "Rahmat! Sizni yana kutib qolamiz.",
  "Fikringiz uchun rahmat, kamchiliklarni albatta tuzatamiz.",
];

const MAX_GENERATED = 150;

/**
 * Biznesning reyting soniga teng sharhlar (deterministik). O'rtacha baho biznes
 * reytingiga yaqin bo'ladi; yangilari birinchi.
 */
export function reviewsFor(business: DemoBusiness, baseDate: number): Review[] {
  const count = Math.min(business.rating.count, MAX_GENERATED);
  const average = business.rating.average ?? 4;
  const random = seededRandom(`reviews:${business.slug}`);
  const reviews: Review[] = [];
  let daysAgo = 0;

  for (let i = 0; i < count; i++) {
    const rating = Math.min(5, Math.max(1, Math.round(average + (random() - 0.5) * 2.4)));
    const tone = rating >= 4 ? "good" : rating === 3 ? "ok" : "bad";
    const texts = TEXTS[tone];
    daysAgo += 1 + Math.floor(random() * 6);
    const createdAt = new Date(baseDate - daysAgo * 86_400_000).toISOString();
    const hasReply = random() < 0.25;

    reviews.push({
      id: demoId(`review:${business.slug}:${i}`),
      authorName: AUTHORS[Math.floor(random() * AUTHORS.length)] ?? "Mehmon",
      rating,
      text: texts[Math.floor(random() * texts.length)] ?? null,
      createdAt,
      reply: hasReply
        ? {
            text: REPLIES[tone === "good" ? 0 : 1] ?? "",
            createdAt: new Date(baseDate - (daysAgo - 1) * 86_400_000).toISOString(),
          }
        : null,
    });
  }
  return reviews;
}
