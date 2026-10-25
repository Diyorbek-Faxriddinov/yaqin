"use client";

import { Star, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { RetryButton } from "@/components/common/retry-button";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RatingStars } from "@/features/business/components/rating";
import { Link } from "@/i18n/navigation";
import type { MyReview } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { useDeleteReview, useMyReviews } from "../use-my-reviews";

const STATUS_TONE: Record<MyReview["status"], string> = {
  pending: "bg-warning-soft text-warning",
  published: "bg-success-soft text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export function MyReviewsList() {
  const t = useTranslations("MyReviews");
  const tProfile = useTranslations("Profile");
  const tStates = useTranslations("States");
  const locale = useLocale();
  const { data, isPending, isError, refetch } = useMyReviews();
  const remove = useDeleteReview();

  if (isPending) return <Skeleton className="h-48" />;
  if (isError) {
    return (
      <ErrorState
        title={tStates("errorTitle")}
        description={tStates("errorDescription")}
        action={<RetryButton onRetry={() => void refetch()} />}
      />
    );
  }
  if (data.length === 0) {
    return <EmptyState icon={Star} title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <ul className="space-y-3">
      {data.map((review) => (
        <li key={review.id}>
          <article className="space-y-2 rounded-xl border p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <Link
                href={`/biznes/${review.business.slug}`}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {review.business.name}
              </Link>
              <Badge className={cn("border-transparent", STATUS_TONE[review.status])}>
                {t(`status.${review.status}`)}
              </Badge>
            </header>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <RatingStars value={review.rating} size="sm" />
              <time dateTime={review.createdAt}>{formatDate(review.createdAt, locale)}</time>
            </div>
            {review.text && <p className="text-sm">{review.text}</p>}
            {review.status === "rejected" && review.rejectionReason && (
              <p className="text-sm text-destructive">
                {t("rejectionReason", { reason: review.rejectionReason })}
              </p>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                  <Trash2 aria-hidden="true" />
                  {t("delete")}
                </Button>
              }
              title={t("deleteConfirmTitle")}
              confirmLabel={t("delete")}
              cancelLabel={tProfile("cancel")}
              pending={remove.isPending}
              onConfirm={async () => {
                await remove.mutateAsync(review.id);
                toast.success(t("deleted"));
              }}
            />
          </article>
        </li>
      ))}
    </ul>
  );
}
