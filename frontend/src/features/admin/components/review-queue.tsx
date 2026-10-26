"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RatingStars } from "@/features/business/components/rating";
import { Link } from "@/i18n/navigation";
import type { AdminReview } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { REVIEW_FILTERS, type ReviewFilter } from "../admin-params";
import { useModerateReview, useReviewQueue } from "../use-moderation";
import { FilterChips, useUrlFilter } from "./filter-chips";
import { NoteDialog } from "./note-dialog";
import { PagedList } from "./paged-list";

const STATUS_TONE: Record<AdminReview["status"], string> = {
  pending: "bg-warning-soft text-warning",
  published: "bg-success-soft text-success",
  rejected: "bg-destructive/10 text-destructive",
};

/** Sharhlar moderatsiyasi: navbat (eng eskisi birinchi), chop etish yoki sabab bilan rad etish */
export function ReviewQueue({ initialFilter }: { initialFilter: ReviewFilter }) {
  const t = useTranslations("Admin.reviews");
  const locale = useLocale();
  const [filter, setFilter] = useUrlFilter(initialFilter, "pending");
  const list = useReviewQueue(filter);
  const moderate = useModerateReview();
  const [rejecting, setRejecting] = useState<AdminReview | null>(null);

  const publish = (review: AdminReview) =>
    moderate.mutate(
      { id: review.id, status: "published" },
      {
        onSuccess: () => toast.success(t("publishedToast")),
        onError: () => toast.error(t("error")),
      },
    );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <FilterChips
        label={t("filterLabel")}
        options={REVIEW_FILTERS}
        value={filter}
        onChange={setFilter}
        getLabel={(value) => t(`filters.${value}`)}
      />

      <PagedList
        query={list}
        countLabel={(count) => t("count", { count })}
        emptyTitle={filter === "pending" ? t("emptyQueue") : t("empty")}
        renderItem={(review) => (
          <article className="space-y-3 rounded-xl border p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={`/admin/bizneslar/${review.business.id}`}
                  className="font-semibold underline-offset-4 hover:underline"
                >
                  {review.business.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {review.author?.displayName ?? t("deletedAuthor")} ·{" "}
                  <time dateTime={review.createdAt}>{formatDate(review.createdAt, locale)}</time>
                </p>
              </div>
              {review.status !== "pending" && (
                <Badge className={cn("border-transparent", STATUS_TONE[review.status])}>
                  {t(`filters.${review.status}`)}
                </Badge>
              )}
            </header>
            <RatingStars value={review.rating} size="sm" />
            {review.text ? (
              <p className="text-sm whitespace-pre-line">{review.text}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">{t("noText")}</p>
            )}
            {review.rejectionReason && (
              <p className="text-sm text-destructive">
                {t("reason", { reason: review.rejectionReason })}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {review.status !== "published" && (
                <Button size="sm" disabled={moderate.isPending} onClick={() => publish(review)}>
                  <Check aria-hidden="true" />
                  {t("publish")}
                </Button>
              )}
              {review.status !== "rejected" && (
                <Button size="sm" variant="outline" onClick={() => setRejecting(review)}>
                  <X aria-hidden="true" />
                  {t("reject")}
                </Button>
              )}
            </div>
          </article>
        )}
      />

      <NoteDialog
        open={rejecting !== null}
        onOpenChange={(open) => !open && setRejecting(null)}
        title={t("rejectTitle")}
        description={t("rejectDescription")}
        label={t("reasonLabel")}
        submitLabel={t("reject")}
        presets={[t("presets.offensive"), t("presets.ads"), t("presets.unrelated")]}
        maxLength={200}
        destructive
        pending={moderate.isPending}
        onSubmit={(reason) =>
          rejecting &&
          moderate.mutate(
            { id: rejecting.id, status: "rejected", rejectionReason: reason },
            {
              onSuccess: () => {
                setRejecting(null);
                toast.success(t("rejectedToast"));
              },
              onError: () => toast.error(t("error")),
            },
          )
        }
      />
    </div>
  );
}
