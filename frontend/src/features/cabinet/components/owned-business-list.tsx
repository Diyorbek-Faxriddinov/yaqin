"use client";

import { ChevronRight, Clock, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessStatusBadge } from "@/features/admin/components/status-badge";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/format/date";
import { useOwnedBusinesses } from "../use-cabinet";

/** /kabinet — foydalanuvchi egasi bo'lgan bizneslar */
export function OwnedBusinessList() {
  const t = useTranslations("Cabinet");
  const tStates = useTranslations("States");
  const locale = useLocale();
  const { data, isPending, isError } = useOwnedBusinesses();

  if (isPending) return <Skeleton className="h-40" />;
  if (isError) {
    return <ErrorState title={tStates("errorTitle")} description={tStates("errorDescription")} />;
  }
  if (data.length === 0) {
    return <EmptyState icon={Store} title={t("listEmpty")} description={t("listEmptyHint")} />;
  }

  return (
    <ul className="space-y-3">
      {data.map((business) => (
        <li key={business.id}>
          <Link
            href={`/kabinet/${business.id}`}
            className="flex items-center gap-4 rounded-xl border p-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {business.cover && (
                // eslint-disable-next-line @next/next/no-img-element -- kichik muqova, ro'yxatda bir nechta
                <img src={business.cover.url} alt="" className="size-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold">{business.name}</span>
                <BusinessStatusBadge status={business.status} />
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {business.category.name} · {business.district.name}
              </p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                {business.pendingChanges > 0 && (
                  <Clock aria-hidden="true" className="size-4 shrink-0 text-warning" />
                )}
                {t("pendingCount", { count: business.pendingChanges })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("ownerSince", { date: formatDate(business.ownerSince, locale) })}
              </p>
            </div>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
            <span className="sr-only">{t("open")}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
