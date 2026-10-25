import Image from "next/image";
import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/features/category/category-icon";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatDistance } from "@/lib/format/distance";
import { cn } from "@/lib/utils";
import type { OpenStatus, PriceRange, RatingSummary } from "../types";
import { OpenStatusBadge } from "./open-status-badge";
import { PriceTag } from "./price-tag";
import { RatingInline } from "./rating";

export type BusinessCardProps = {
  href: string;
  name: string;
  categoryName: string;
  categoryIconKey: string | null;
  districtName: string;
  imageUrl?: string | null;
  rating: RatingSummary | null;
  priceRange?: PriceRange | null;
  openStatus: OpenStatus;
  /** Foydalanuvchi joylashuvi maʼlum bo'lsagina keladi */
  distanceMeters?: number | null;
  className?: string;
};

/**
 * Kartadagi rasm bezak vazifasini bajaradi (nomi yonida yozilgan) — alt bo'sh.
 * Rasm bo'lmasa — kategoriya ikonkasi bilan neytral joy egallovchi.
 */
function CardImage({ imageUrl, iconKey }: { imageUrl?: string | null; iconKey: string | null }) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        fill
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
    );
  }

  return (
    <div className="flex size-full items-center justify-center bg-primary-soft text-primary-soft-foreground/70">
      <CategoryIcon iconKey={iconKey} className="size-10" />
    </div>
  );
}

export function BusinessCard({
  href,
  name,
  categoryName,
  categoryIconKey,
  districtName,
  imageUrl,
  rating,
  priceRange,
  openStatus,
  distanceMeters,
  className,
}: BusinessCardProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Business");

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <CardImage imageUrl={imageUrl} iconKey={categoryIconKey} />
        <OpenStatusBadge status={openStatus} className="absolute top-2 left-2 shadow-sm" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-1 font-semibold">
          {/* Butun karta bosiladigan, lekin havola nomi qisqa qoladi (stretched link) */}
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            {name}
          </Link>
        </h3>
        <p className="line-clamp-1 text-sm text-muted-foreground">
          {categoryName} · {districtName}
        </p>
        <RatingInline rating={rating} />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pt-1 text-sm">
          {priceRange ? <PriceTag price={priceRange} /> : <span />}
          {distanceMeters != null && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5" />
              <span className="sr-only">
                {t("distance", { distance: formatDistance(distanceMeters, locale) })}
              </span>
              <span aria-hidden="true">{formatDistance(distanceMeters, locale)}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function BusinessCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </div>
    </div>
  );
}
