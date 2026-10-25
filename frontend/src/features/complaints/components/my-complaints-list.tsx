"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquareWarning } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { RetryButton } from "@/components/common/retry-button";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { browserApi, call } from "@/lib/api/browser";
import type { Complaint } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";

export const myComplaintsKey = ["me", "complaints"] as const;

const STATUS_TONE: Record<Complaint["status"], string> = {
  open: "bg-muted text-muted-foreground",
  in_review: "bg-warning-soft text-warning",
  resolved: "bg-success-soft text-success",
  rejected: "bg-destructive/10 text-destructive",
};

export function MyComplaintsList() {
  const t = useTranslations("MyComplaints");
  const tReasons = useTranslations("Complaint.reasons");
  const tStates = useTranslations("States");
  const locale = useLocale();
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: myComplaintsKey,
    queryFn: () => call(browserApi.GET("/me/complaints")),
  });

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
    return (
      <EmptyState
        icon={MessageSquareWarning}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((complaint) => (
        <li key={complaint.id}>
          <article className="space-y-2 rounded-xl border p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <Link
                href={`/biznes/${complaint.business.slug}`}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {complaint.business.name}
              </Link>
              <Badge className={cn("border-transparent", STATUS_TONE[complaint.status])}>
                {t(`status.${complaint.status}`)}
              </Badge>
            </header>
            <p className="text-sm font-medium">{tReasons(complaint.reason)}</p>
            {complaint.text && <p className="text-sm">{complaint.text}</p>}
            <time dateTime={complaint.createdAt} className="block text-sm text-muted-foreground">
              {formatDate(complaint.createdAt, locale)}
            </time>
            {complaint.resolutionNote && (
              <p className="rounded-lg bg-muted p-3 text-sm">
                {t("resolution", { note: complaint.resolutionNote })}
              </p>
            )}
          </article>
        </li>
      ))}
    </ul>
  );
}
