"use client";

import { useState } from "react";
import { Check, Eye, Pencil, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AdminComplaint } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { COMPLAINT_FILTERS, type ComplaintFilter } from "../admin-params";
import { useCan } from "../use-admin";
import { useComplaintQueue, useUpdateComplaint } from "../use-moderation";
import { FilterChips, useUrlFilter } from "./filter-chips";
import { NoteDialog } from "./note-dialog";
import { PagedList } from "./paged-list";

const STATUS_TONE: Record<AdminComplaint["status"], string> = {
  open: "bg-warning-soft text-warning",
  in_review: "bg-primary-soft text-primary-soft-foreground",
  resolved: "bg-success-soft text-success",
  rejected: "bg-muted text-muted-foreground",
};

type Closing = { complaint: AdminComplaint; status: "resolved" | "rejected" };

/** Shikoyatlar: ko'rib chiqishga olish, biznesni tuzatish, foydalanuvchiga javob bilan yopish */
export function ComplaintQueue({ initialFilter }: { initialFilter: ComplaintFilter }) {
  const t = useTranslations("Admin.complaints");
  const tReasons = useTranslations("Complaint.reasons");
  const tStatus = useTranslations("MyComplaints.status");
  const locale = useLocale();
  const canEditBusiness = useCan("business.edit");
  const [filter, setFilter] = useUrlFilter(initialFilter, "open");
  const list = useComplaintQueue(filter);
  const update = useUpdateComplaint();
  const [closing, setClosing] = useState<Closing | null>(null);

  const takeIntoReview = (complaint: AdminComplaint) =>
    update.mutate(
      { id: complaint.id, status: "in_review" },
      {
        onSuccess: () => toast.success(t("inReviewToast")),
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
        options={COMPLAINT_FILTERS}
        value={filter}
        onChange={setFilter}
        getLabel={(value) => tStatus(value)}
      />

      <PagedList
        query={list}
        countLabel={(count) => t("count", { count })}
        emptyTitle={filter === "open" ? t("emptyQueue") : t("empty")}
        renderItem={(complaint) => {
          const active = complaint.status === "open" || complaint.status === "in_review";
          return (
            <article className="space-y-3 rounded-xl border p-4">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold">{complaint.business.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {complaint.reporter.displayName} ·{" "}
                    <time dateTime={complaint.createdAt}>
                      {formatDate(complaint.createdAt, locale)}
                    </time>
                  </p>
                </div>
                <Badge className={cn("border-transparent", STATUS_TONE[complaint.status])}>
                  {tStatus(complaint.status)}
                </Badge>
              </header>
              <p className="text-sm font-medium">{tReasons(complaint.reason)}</p>
              {complaint.text && <p className="text-sm whitespace-pre-line">{complaint.text}</p>}
              {complaint.resolutionNote && (
                <p className="text-sm text-muted-foreground">
                  {t("answer", { note: complaint.resolutionNote })}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {canEditBusiness && active && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/bizneslar/${complaint.business.id}`}>
                      <Pencil aria-hidden="true" />
                      {t("editBusiness")}
                    </Link>
                  </Button>
                )}
                {complaint.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() => takeIntoReview(complaint)}
                  >
                    <Eye aria-hidden="true" />
                    {t("takeIntoReview")}
                  </Button>
                )}
                {active && (
                  <>
                    <Button size="sm" onClick={() => setClosing({ complaint, status: "resolved" })}>
                      <Check aria-hidden="true" />
                      {t("resolve")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setClosing({ complaint, status: "rejected" })}
                    >
                      <X aria-hidden="true" />
                      {t("reject")}
                    </Button>
                  </>
                )}
              </div>
            </article>
          );
        }}
      />

      <NoteDialog
        open={closing !== null}
        onOpenChange={(open) => !open && setClosing(null)}
        title={closing?.status === "rejected" ? t("rejectTitle") : t("resolveTitle")}
        description={t("answerDescription")}
        label={t("answerLabel")}
        submitLabel={closing?.status === "rejected" ? t("reject") : t("resolve")}
        presets={
          closing?.status === "rejected"
            ? [t("presets.checkedCorrect"), t("presets.notEnough")]
            : [t("presets.updated"), t("presets.hidden")]
        }
        maxLength={500}
        pending={update.isPending}
        onSubmit={(note) =>
          closing &&
          update.mutate(
            { id: closing.complaint.id, status: closing.status, resolutionNote: note },
            {
              onSuccess: () => {
                setClosing(null);
                toast.success(t("closedToast"));
              },
              onError: () => toast.error(t("error")),
            },
          )
        }
      />
    </div>
  );
}
