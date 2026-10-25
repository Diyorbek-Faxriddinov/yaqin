import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/features/category/category-icon";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { BusinessSummary } from "@/lib/api/types";
import { formatDistance } from "@/lib/format/distance";
import { cn } from "@/lib/utils";
import { BusinessOpenStatus } from "./business-open-status";
import { PriceTag } from "./price-tag";
import { RatingInline } from "./rating";

/**
 * - vertical: rasm tepada (bosh sahifa karuseli, desktop to'rlari);
 * - responsive: telefonda gorizontal ixcham qator (bir ekranga 4–5 ta), sm+ da vertical.
 */
export type BusinessCardLayout = "vertical" | "responsive";

const LAYOUT = {
  vertical: {
    root: "flex-col",
    media: "aspect-[4/3] w-full",
    icon: "size-10",
    body: "",
  },
  responsive: {
    root: "flex-row sm:flex-col",
    media: "w-28 shrink-0 self-stretch sm:aspect-[4/3] sm:w-full sm:self-auto",
    icon: "size-8 sm:size-10",
    // Telefonda yurakcha matn ustunining burchagida — uzun nom uning ostiga kirmasin
    body: "pr-12 sm:pr-3",
  },
} as const;

/**
 * Kartadagi rasm bezak vazifasini bajaradi (nomi yonida yozilgan) — alt bo'sh.
 * Rasm bo'lmasa — kategoriya ikonkasi bilan neytral joy egallovchi.
 */
function CardMedia({
  business,
  layout,
}: {
  business: BusinessSummary;
  layout: BusinessCardLayout;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-primary-soft", LAYOUT[layout].media)}>
      {business.coverImage ? (
        <Image
          src={business.coverImage.url}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 112px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex size-full min-h-24 items-center justify-center text-primary-soft-foreground/70">
          <CategoryIcon iconKey={business.category.iconKey} className={LAYOUT[layout].icon} />
        </div>
      )}
    </div>
  );
}

export function BusinessCard({
  business,
  layout = "vertical",
  className,
}: {
  business: BusinessSummary;
  layout?: BusinessCardLayout;
  className?: string;
}) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Business");
  const distance =
    business.distanceMeters != null ? formatDistance(business.distanceMeters, locale) : null;

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-xl border bg-card transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-md",
        LAYOUT[layout].root,
        className,
      )}
    >
      <CardMedia business={business} layout={layout} />
      <FavoriteButton
        businessId={business.id}
        businessName={business.name}
        className="absolute top-2 right-2"
      />

      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5 p-3", LAYOUT[layout].body)}>
        <h3 className="flex items-center gap-1 font-semibold">
          {/* Butun karta bosiladigan, lekin havola nomi qisqa qoladi (stretched link) */}
          <Link
            href={`/biznes/${business.slug}`}
            className="line-clamp-1 after:absolute after:inset-0 focus-visible:outline-none"
          >
            {business.name}
          </Link>
          {business.isVerified && (
            <BadgeCheck aria-label={t("verified")} className="size-4 shrink-0 text-primary" />
          )}
        </h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {business.category.name} · {business.district.name}
        </p>
        <RatingInline
          rating={
            business.rating.average != null
              ? { average: business.rating.average, count: business.rating.count }
              : null
          }
        />
        <div>
          <BusinessOpenStatus schedule={business.schedule} />
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1 text-sm">
          {business.priceRange ? <PriceTag price={business.priceRange} /> : <span />}
          {distance && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5" />
              <span className="sr-only">{t("distance", { distance })}</span>
              <span aria-hidden="true">{distance}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function BusinessCardSkeleton({ layout = "vertical" }: { layout?: BusinessCardLayout }) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex overflow-hidden rounded-xl border bg-card", LAYOUT[layout].root)}
    >
      <Skeleton className={cn("min-h-24 rounded-none", LAYOUT[layout].media)} />
      <div className="flex-1 space-y-2 p-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </div>
  );
}

/** Ro'yxat sahifalari uchun to'r: telefonda qatorlar, kattaroq ekranda 2–3 ustun */
export function BusinessGrid({ businesses }: { businesses: BusinessSummary[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {businesses.map((business) => (
        <li key={business.id} className="flex">
          <BusinessCard business={business} layout="responsive" className="w-full" />
        </li>
      ))}
    </ul>
  );
}

export function BusinessGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <BusinessCardSkeleton key={index} layout="responsive" />
      ))}
    </div>
  );
}
