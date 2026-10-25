/**
 * Lotin nomidan URL slug'i yoki atribut kaliti. Kirill yoki boshqa yozuvdagi harflar tushib
 * qoladi — natija bo'sh bo'lsa, administrator qiymatni o'zi kiritadi.
 */
function latinWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[ʻʼ'`‘’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** "Oʻyinchoqlar va sovgʻalar" → "oyinchoqlar-va-sovgalar" */
export function toSlug(name: string): string {
  return latinWords(name).join("-").slice(0, 60).replace(/-$/, "");
}

/** "Kafolat muddati" → "kafolat_muddati" (harf bilan boshlanadi, 40 belgigacha) */
export function toKey(name: string): string {
  const key = latinWords(name)
    .join("_")
    .replace(/^[0-9_]+/, "")
    .slice(0, 40)
    .replace(/_$/, "");
  return key.length >= 2 ? key : "";
}

/** Band bo'lsa raqam qo'shiladi: size → size_2 */
export function uniqueKey(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
