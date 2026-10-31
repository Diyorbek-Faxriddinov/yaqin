import type { AdminAttribute, ItemAttribute, ItemAttributeInput } from "@/lib/api/types";
import type { Lang } from "./db";

/**
 * Mahsulot xususiyatlari — backend `apps/businesses/attributes.py` bilan bir xil (ADR-0014).
 *
 * Saqlash: erkin — `{key: slug(nom), name, value}`; kategoriya xususiyati — qo'shimcha `raw`
 * (xom qiymat). `name`/`value` — saqlangan paytdagi o'zbekcha ko'rinish: ta'rif keyin o'chirilsa
 * yoki variant olib tashlansa, shu ko'rsatiladi.
 */
export type StoredAttribute = ItemAttribute & { raw?: string };

const BOOLEAN_LABELS: Record<Lang, [string, string]> = { uz: ["Ha", "Yoʻq"], ru: ["Да", "Нет"] };
const NUMBER = /^\d{1,9}(?:[.,]\d{1,3})?$/;

export function definitionsOf(attributes: AdminAttribute[]): Map<string, AdminAttribute> {
  return new Map(attributes.map((definition) => [definition.key, definition]));
}

/** Kiritilgan qiymat → xom qiymat; turiga mos kelmasa — null */
export function parseRaw(definition: AdminAttribute, value: string): string | null {
  switch (definition.type) {
    case "text":
      return value || null;
    case "number":
      return NUMBER.test(value) ? value.replace(",", ".") : null;
    case "boolean":
      return value === "true" || value === "false" ? value : null;
    case "select":
      return definition.options.some((o) => o.value === value) ? value : null;
    case "multiselect": {
      const chosen = new Set(
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      );
      const options = definition.options.map((o) => o.value);
      if (chosen.size === 0 || [...chosen].some((v) => !options.includes(v))) return null;
      // Ta'rifdagi tartibda, takrorsiz
      return options.filter((option) => chosen.has(option)).join(",");
    }
  }
}

export function displayValue(definition: AdminAttribute, raw: string, lang: Lang): string {
  switch (definition.type) {
    case "boolean":
      return BOOLEAN_LABELS[lang][raw === "true" ? 0 : 1];
    case "number": {
      const number = raw.replace(".", ",");
      return definition.unit ? `${number} ${definition.unit}` : number;
    }
    case "select":
    case "multiselect": {
      const labels = new Map(definition.options.map((o) => [o.value, o.label[lang]]));
      return raw
        .split(",")
        .filter((value) => labels.has(value))
        .map((value) => labels.get(value))
        .join(", ");
    }
    default:
      return raw;
  }
}

/** Saqlangan kategoriya xususiyati hozirgi ta'rifga hali mos kelsa — ta'rif */
function definitionFor(
  stored: StoredAttribute,
  known: Map<string, AdminAttribute>,
): AdminAttribute | null {
  const definition = known.get(stored.key);
  if (stored.raw == null || !definition || parseRaw(definition, stored.raw) == null) return null;
  return definition;
}

export function publicAttributes(
  stored: StoredAttribute[],
  known: Map<string, AdminAttribute>,
  lang: Lang,
): ItemAttribute[] {
  return stored.map((entry) => {
    const definition = definitionFor(entry, known);
    if (!definition) return { key: entry.key, name: entry.name, value: entry.value };
    return {
      key: entry.key,
      name: definition.name[lang],
      value: displayValue(definition, entry.raw!, lang),
    };
  });
}

/** Tahrirlash formasi uchun (AdminItem.attributeValues) */
export function inputValues(
  stored: StoredAttribute[],
  known: Map<string, AdminAttribute>,
): ItemAttributeInput[] {
  return stored.map((entry) => {
    const definition = definitionFor(entry, known);
    return definition
      ? { key: entry.key, name: definition.name.uz, value: entry.raw! }
      : { key: null, name: entry.name, value: entry.value };
  });
}

/** Kategoriya xususiyati uchun saqlanadigan ko'rinish (xom qiymat to'g'ri deb olinadi) */
export function storedTyped(definition: AdminAttribute, raw: string): StoredAttribute {
  return {
    key: definition.key,
    name: definition.name.uz,
    value: displayValue(definition, raw, "uz"),
    raw,
  };
}

/** ItemAttributeInput ro'yxati → saqlanadigan ko'rinish va xatolar */
export function parseAttributeInput(
  attributes: ItemAttributeInput[],
  known: Map<string, AdminAttribute>,
  slugify: (name: string) => string,
): { stored: StoredAttribute[]; problems: string[] } {
  const stored: StoredAttribute[] = [];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const entry of attributes) {
    const name = typeof entry?.name === "string" ? entry.name.trim() : "";
    const value = typeof entry?.value === "string" ? entry.value.trim() : "";
    if (entry?.key == null || entry.key === "") {
      if (name && value) stored.push({ key: slugify(name) || "xususiyat", name, value });
      continue;
    }
    const definition = known.get(entry.key);
    if (!definition) {
      problems.push("Kategoriyada bunday xususiyat yoʻq");
      continue;
    }
    if (seen.has(entry.key)) {
      problems.push(`${definition.name.uz}: takrorlangan`);
      continue;
    }
    seen.add(entry.key);
    if (!value) continue;
    const raw = parseRaw(definition, value);
    if (raw == null) {
      problems.push(`${definition.name.uz}: qiymat notoʻgʻri`);
      continue;
    }
    stored.push(storedTyped(definition, raw));
  }
  return { stored, problems };
}
