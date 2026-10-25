import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { Item, ItemPrice } from "@/lib/api/types";
import { formatDuration } from "@/lib/format/duration";
import { formatPrice, formatPriceRange } from "@/lib/format/price";
import { cn } from "@/lib/utils";

/** Narx turi bo'yicha matn: aniq, "... dan", oraliq, "so'rov bo'yicha" */
export function ItemPriceText({ price, className }: { price: ItemPrice; className?: string }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("BusinessPage.price");

  let text: string;
  if (price.type === "on_request" || !price.min) {
    text = t("onRequest");
  } else if (price.type === "from") {
    text = t("from", { price: formatPrice(price.min, locale) });
  } else if (price.type === "range" && price.max) {
    text = formatPriceRange(price.min, price.max, locale);
  } else {
    text = formatPrice(price.min, locale);
  }

  return (
    <span
      className={cn(
        "font-semibold whitespace-nowrap tabular-nums",
        price.type === "on_request" && "font-normal text-muted-foreground",
        className,
      )}
    >
      {text}
    </span>
  );
}

/** Mahsulot va xizmatlar, biznes belgilagan bo'limlar bo'yicha guruhlangan */
export function ItemList({ items, businessSlug }: { items: Item[]; businessSlug: string }) {
  const t = useTranslations("BusinessPage");
  const locale = useLocale() as AppLocale;

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noItems")}</p>;
  }

  // Bo'limlar tartibi — birinchi uchragan tartibda
  const groups = new Map<string | null, Item[]>();
  for (const item of items) {
    groups.set(item.group, [...(groups.get(item.group) ?? []), item]);
  }
  const showHeadings = groups.size > 1;

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([group, groupItems]) => (
        <div key={group ?? "_"}>
          {showHeadings && (
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {group ?? t("otherGroup")}
            </h3>
          )}
          <ul className="divide-y rounded-xl border">
            {groupItems.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 p-3">
                <div className="min-w-0">
                  <Link
                    href={`/biznes/${businessSlug}/${item.slug}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {item.durationMinutes != null && (
                      <span className="inline-flex items-center gap-1">
                        <Clock aria-hidden="true" className="size-3.5" />
                        {formatDuration(item.durationMinutes, locale)}
                      </span>
                    )}
                    {item.attributes.map((attribute) => (
                      <span key={attribute.key}>
                        {attribute.name}: {attribute.value}
                      </span>
                    ))}
                    {!item.isAvailable && <span className="text-warning">{t("unavailable")}</span>}
                  </div>
                </div>
                <ItemPriceText price={item.price} className="pt-0.5 text-right" />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
