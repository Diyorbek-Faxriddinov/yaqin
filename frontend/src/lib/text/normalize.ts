/**
 * Qidiruv uchun matnni yagona ko'rinishga keltiradi:
 * - kichik harflar;
 * - o'zbek kirill → lotin (ҳ → h, ў → o, ғ → g, ...), rus kirill ham shu jadval bilan;
 * - barcha apostrof turlari (ʻ ‘ ’ ' ` ʼ) olib tashlanadi: "doʻkon", "do'kon", "dokon" — bir xil;
 * - ortiqcha bo'shliqlar qisqartiriladi.
 *
 * Backend (3-bosqich) ham xuddi shu qoidalarni qo'llashi kerak — ADR-0010.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  ғ: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  қ: "q",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ў: "o",
  ф: "f",
  х: "x",
  ҳ: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const APOSTROPHES = /['`ʻʼ‘’´]/g;

export function normalizeForSearch(input: string): string {
  let result = "";
  for (const char of input.toLowerCase()) {
    result += CYRILLIC_TO_LATIN[char] ?? char;
  }
  return result
    .replace(APOSTROPHES, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Har bir so'rov so'zi matnda (normallashtirilgan holda) uchrasa — mos keladi.
 * 5+ harfli so'zlarning oxirgi harfi hisobga olinmaydi — oddiy qo'shimcha farqlari uchun
 * ("аптека" ↔ "Аптеки"). Backend buni pg_trgm o'xshashlik qidiruvi bilan aniqroq qiladi.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = normalizeForSearch(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const text = normalizeForSearch(haystack);
  return tokens.every((token) => text.includes(token.length >= 5 ? token.slice(0, -1) : token));
}
