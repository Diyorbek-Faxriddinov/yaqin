import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/routing";
import { formatPrice, formatPriceRange, type Money } from "@/lib/format/price";
import { cn } from "@/lib/utils";
import type { PriceRange } from "../types";

export function PriceTag({ price, className }: { price: Money | PriceRange; className?: string }) {
  const locale = useLocale() as AppLocale;
  const text =
    "amount" in price ? formatPrice(price, locale) : formatPriceRange(price.min, price.max, locale);

  return (
    <span className={cn("font-semibold whitespace-nowrap tabular-nums", className)}>{text}</span>
  );
}
