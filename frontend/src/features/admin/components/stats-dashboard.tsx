"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RetryButton } from "@/components/common/retry-button";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodChips, StatsOverview } from "@/features/stats/components/stats-overview";
import { Link } from "@/i18n/navigation";
import { isDemoMode } from "@/lib/env";
import { groupDigits } from "@/lib/format/price";
import { usePlatformStats, type Days } from "../use-system";

/** Platforma statistikasi: ko'rishlar va bosishlar, eng ko'p ko'rilgan bizneslar, yangi kontent */
export function StatsDashboard() {
  const t = useTranslations("Admin.stats");
  const tStates = useTranslations("States");
  const [days, setDays] = useState<Days>(30);
  const { data, isPending, isError, refetch } = usePlatformStats(days);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {isDemoMode && (
        <Alert>
          <AlertDescription>{t("demoNote")}</AlertDescription>
        </Alert>
      )}

      <PeriodChips value={days} onChange={(value) => setDays(value as Days)} />

      {isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : isError ? (
        <ErrorState
          title={tStates("errorTitle")}
          description={tStates("errorDescription")}
          action={<RetryButton onRetry={() => void refetch()} />}
        />
      ) : (
        <>
          <StatsOverview series={data} />

          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <section aria-labelledby="top-businesses" className="rounded-xl border p-4">
              <h2 id="top-businesses" className="mb-3 font-medium">
                {t("topTitle")}
              </h2>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th scope="col" className="pb-2 font-medium">
                      {t("business")}
                    </th>
                    <th scope="col" className="pb-2 pl-3 text-right font-medium">
                      {t("views")}
                    </th>
                    <th scope="col" className="pb-2 pl-3 text-right font-medium">
                      {t("contacts")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y tabular-nums">
                  {data.topBusinesses.map(({ business, profileViews, contactClicks }) => (
                    <tr key={business.id}>
                      <th scope="row" className="py-2 pr-2 text-left font-normal">
                        <Link
                          href={`/admin/bizneslar/${business.id}?bolim=stats`}
                          className="underline-offset-4 hover:underline"
                        >
                          {business.name}
                        </Link>
                      </th>
                      <td className="py-2 pl-3 text-right">{groupDigits(profileViews)}</td>
                      <td className="py-2 pl-3 text-right">{groupDigits(contactClicks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section aria-labelledby="content-stats" className="rounded-xl border p-4">
              <h2 id="content-stats" className="mb-3 font-medium">
                {t("contentTitle", { count: days })}
              </h2>
              <dl className="divide-y text-sm">
                {(
                  [
                    "publishedBusinesses",
                    "newBusinesses",
                    "newReviews",
                    "newComplaints",
                    "newRequests",
                  ] as const
                ).map((key) => (
                  <div key={key} className="flex justify-between gap-3 py-2">
                    <dt className="text-muted-foreground">{t(`content.${key}`)}</dt>
                    <dd className="font-semibold tabular-nums">{groupDigits(data.content[key])}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
