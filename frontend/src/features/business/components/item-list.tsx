import Image from "next/image";
import { Clock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CategoryIcon } from "@/features/category/category-icon";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { Item, ItemPrice } from "@/lib/api/types";
import { isDemoMode } from "@/lib/env";
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

function ItemThumb({
  item,
  iconKey,
  sizes,
  className,
}: {
  item: Item;
  iconKey: string | null;
  sizes: string;
  className?: string;
}) {
  const image = item.images[0];
  return (
    <div className={cn("relative overflow-hidden bg-primary-soft", className)}>
      {image ? (
        // Bezak: nomi yonida yozilgan — alt bo'sh
        <Image
          src={image.url}
          alt=""
          fill
          sizes={sizes}
          unoptimized={isDemoMode}
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-primary-soft-foreground/60">
          <CategoryIcon iconKey={iconKey} className="size-8" />
        </div>
      )}
    </div>
  );
}

function ItemDetails({ item }: { item: Item }) {
  const t = useTranslations("BusinessPage");
  const locale = useLocale() as AppLocale;
  return (
    <>
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
    </>
  );
}

/** Mahsulot — rasmli kartochka (do'konda mijoz avvalo ko'rinishiga qaraydi) */
function ProductCard({
  item,
  businessSlug,
  iconKey,
}: {
  item: Item;
  businessSlug: string;
  iconKey: string | null;
}) {
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl border bg-card focus-within:ring-3 focus-within:ring-ring/50">
      <ItemThumb
        item={item}
        iconKey={iconKey}
        sizes="(min-width: 640px) 240px, 50vw"
        className="aspect-square w-full"
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        {/* Butun karta bosiladi (stretched link) */}
        <Link
          href={`/biznes/${businessSlug}/${item.slug}`}
          className="line-clamp-2 font-medium after:absolute after:inset-0 focus-visible:outline-none"
        >
          {item.name}
        </Link>
        <div className="line-clamp-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <ItemDetails item={item} />
        </div>
        <ItemPriceText price={item.price} className="mt-auto pt-1 text-sm" />
      </div>
    </li>
  );
}

function ServiceRow({
  item,
  businessSlug,
  iconKey,
}: {
  item: Item;
  businessSlug: string;
  iconKey: string | null;
}) {
  return (
    <li className="flex items-start gap-3 p-3">
      {item.images.length > 0 && (
        <ItemThumb item={item} iconKey={iconKey} sizes="56px" className="size-14 rounded-lg" />
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/biznes/${businessSlug}/${item.slug}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {item.name}
        </Link>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <ItemDetails item={item} />
        </div>
      </div>
      <ItemPriceText price={item.price} className="pt-0.5 text-right" />
    </li>
  );
}

/**
 * Mahsulot va xizmatlar, biznes belgilagan bo'limlar bo'yicha guruhlangan. Bo'lim ichida
 * mahsulotlar — kartochkalar to'ri, xizmatlar — narx ro'yxati.
 */
export function ItemList({
  items,
  businessSlug,
  iconKey,
}: {
  items: Item[];
  businessSlug: string;
  /** Rasmsiz mahsulot uchun kategoriya ikonkasi */
  iconKey: string | null;
}) {
  const t = useTranslations("BusinessPage");

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
      {[...groups.entries()].map(([group, groupItems]) => {
        const products = groupItems.filter((item) => item.kind === "product");
        const services = groupItems.filter((item) => item.kind === "service");
        return (
          <div key={group ?? "_"} className="space-y-3">
            {showHeadings && (
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                {group ?? t("otherGroup")}
              </h3>
            )}
            {products.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {products.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    businessSlug={businessSlug}
                    iconKey={iconKey}
                  />
                ))}
              </ul>
            )}
            {services.length > 0 && (
              <ul className="divide-y rounded-xl border">
                {services.map((item) => (
                  <ServiceRow
                    key={item.id}
                    item={item}
                    businessSlug={businessSlug}
                    iconKey={iconKey}
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
