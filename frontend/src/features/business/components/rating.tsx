import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatDecimal } from "@/lib/format/number";
import { cn } from "@/lib/utils";
import type { RatingSummary } from "../types";

/** Ixcham ko'rinish (kartalar uchun): ★ 4,7 · 23 ta sharh */
export function RatingInline({
  rating,
  className,
}: {
  rating: RatingSummary | null;
  className?: string;
}) {
  const t = useTranslations("Business");

  if (!rating || rating.count === 0) {
    return <span className={cn("text-sm text-muted-foreground", className)}>{t("noReviews")}</span>;
  }

  const value = formatDecimal(rating.average);

  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star aria-hidden="true" className="size-4 fill-highlight text-highlight" />
      <span className="font-semibold">
        <span className="sr-only">{t("rating", { value })}</span>
        <span aria-hidden="true">{value}</span>
      </span>
      <span className="text-muted-foreground">· {t("reviews", { count: rating.count })}</span>
    </span>
  );
}

/** To'liq ko'rinish (biznes profili uchun): besh yulduz, qisman to'ldirilgan */
export function RatingStars({
  value,
  size = "md",
  className,
}: {
  value: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("Business");
  const iconSize = { sm: "size-3.5", md: "size-4", lg: "size-6" }[size];
  const clamped = Math.min(5, Math.max(0, value));

  return (
    <span
      role="img"
      aria-label={t("rating", { value: formatDecimal(clamped) })}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.min(1, Math.max(0, clamped - index));
        return (
          <span key={index} className={cn("relative", iconSize)}>
            <Star aria-hidden="true" className={cn("absolute inset-0 text-border", iconSize)} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star aria-hidden="true" className={cn("fill-highlight text-highlight", iconSize)} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
