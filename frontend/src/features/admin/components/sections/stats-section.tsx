"use client";

import { useState } from "react";
import { Copy, Link2, Loader2, Share2, TriangleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodChips, StatsOverview } from "@/features/stats/components/stats-overview";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { AdminBusiness } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { isDemoMode } from "@/lib/env";
import { useCan } from "../../use-admin";
import {
  useBusinessStats,
  useCreateReportLink,
  useReportLink,
  useRevokeReportLink,
  type Days,
} from "../../use-system";

/**
 * Egasi uchun maxfiy hisobot havolasi (ADR-0007): faqat yaratilganda bir marta ko'rsatiladi —
 * backend tokenning xeshini saqlaydi. Yo'qolsa yangisi yaratiladi (eskisi bekor bo'ladi).
 */
function ReportLinkCard({ business }: { business: AdminBusiness }) {
  const t = useTranslations("Admin.report");
  const locale = useLocale() as AppLocale;
  const canEdit = useCan("business.edit");
  const { data: status, isPending } = useReportLink(business.id);
  const create = useCreateReportLink(business.id);
  const revoke = useRevokeReportLink(business.id);
  const [url, setUrl] = useState<string | null>(null);

  const generate = () =>
    create.mutate(undefined, {
      onSuccess: ({ token }) => {
        setUrl(`${window.location.origin}${getPathname({ href: `/hisobot/${token}`, locale })}`);
        toast.success(t("created"));
      },
      onError: () => toast.error(t("error")),
    });

  const copy = () =>
    url &&
    void navigator.clipboard
      ?.writeText(url)
      .then(() => toast.success(t("copied")))
      .catch(() => toast.error(t("copyFailed")));

  return (
    <section aria-labelledby="report-link-title" className="space-y-3 rounded-xl border p-4">
      <div className="space-y-1">
        <h3 id="report-link-title" className="flex items-center gap-2 font-medium">
          <Link2 aria-hidden="true" className="size-4" />
          {t("title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {isPending ? (
        <Skeleton className="h-10" />
      ) : (
        <>
          {status?.active && (
            <p className="text-sm">
              {t("active", { date: formatDate(status.createdAt ?? "", locale) })}{" "}
              <span className="text-muted-foreground">
                {status.lastViewedAt
                  ? t("viewed", {
                      count: status.viewCount,
                      date: formatDate(status.lastViewedAt, locale),
                    })
                  : t("notViewed")}
              </span>
            </p>
          )}

          {url && (
            <div className="space-y-2 rounded-lg bg-muted p-3">
              <p className="flex items-start gap-2 text-sm">
                <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                {t("onceWarning")}
              </p>
              <p className="font-mono text-xs break-all" data-testid="report-url">
                {url}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={copy}>
                  <Copy aria-hidden="true" />
                  {t("copy")}
                </Button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void navigator
                        .share({ title: t("shareTitle", { name: business.name }), url })
                        .catch(() => undefined)
                    }
                  >
                    <Share2 aria-hidden="true" />
                    {t("share")}
                  </Button>
                )}
              </div>
            </div>
          )}

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={create.isPending} onClick={generate}>
                {create.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
                {status?.active ? t("regenerate") : t("create")}
              </Button>
              {status?.active && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="ghost">
                      {t("revoke")}
                    </Button>
                  }
                  title={t("revokeConfirm")}
                  description={t("revokeHint")}
                  confirmLabel={t("revoke")}
                  cancelLabel={t("cancel")}
                  pending={revoke.isPending}
                  onConfirm={async () => {
                    try {
                      await revoke.mutateAsync();
                      setUrl(null);
                      toast.success(t("revoked"));
                    } catch {
                      toast.error(t("error"));
                    }
                  }}
                />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Biznes tahriridagi "Statistika" bo'limi (ustada yo'q — biznes saytda bo'lgandan keyin kerak) */
export function StatsSection({ business }: { business: AdminBusiness }) {
  const t = useTranslations("Admin.stats");
  const [days, setDays] = useState<Days>(30);
  const { data, isPending } = useBusinessStats(business.id, days);

  return (
    <div className="space-y-5">
      {isDemoMode && (
        <Alert>
          <AlertDescription>{t("demoNote")}</AlertDescription>
        </Alert>
      )}
      <PeriodChips value={days} onChange={(value) => setDays(value as Days)} />
      {isPending || !data ? <Skeleton className="h-80" /> : <StatsOverview series={data} />}
      <ReportLinkCard business={business} />
    </div>
  );
}
