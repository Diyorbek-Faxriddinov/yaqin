import type { Item } from "@/lib/api/types";

/** Katalog bo'limi sarlavhasi turlarga qarab: faqat mahsulotlar, faqat xizmatlar yoki aralash */
export function catalogTitleKey(items: Pick<Item, "kind">[]): "products" | "services" | "catalog" {
  if (items.length > 0 && items.every((item) => item.kind === "product")) return "products";
  if (items.length > 0 && items.every((item) => item.kind === "service")) return "services";
  return "catalog";
}

/**
 * Admin formasida yangi mahsulot turi: biznesdagi ko'pchilik turi; katalog bo'sh bo'lsa —
 * kategoriyaga qarab (do'konlar va ovqatlanish — mahsulot, qolganlari — xizmat)
 */
export function defaultKind(
  items: Pick<Item, "kind">[],
  iconKey: string | null,
): "product" | "service" {
  const products = items.filter((item) => item.kind === "product").length;
  if (items.length > 0) return products * 2 >= items.length ? "product" : "service";
  return iconKey === "shopping" || iconKey === "food" ? "product" : "service";
}
