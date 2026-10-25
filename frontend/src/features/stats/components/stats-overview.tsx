"use client";

import { useState } from "react";
import { Eye, MapPinned, Phone, Send, Table2, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { StatsSeries } from "@/lib/api/types";
import { formatShortDay } from "@/lib/format/date";
import { groupDigits } from "@/lib/format/price";
import { cn } from "@/lib/utils";
import { StatsChart, type StatsMetric } from "./stats-chart";

const METRICS: Array<{ key: StatsMetric; icon: LucideIcon }> = [
  { key: "profileViews", icon: Eye },
  { key: "calls", icon: Phone },
  { key: "telegramClicks", icon: Send },
  { key: "directionClicks", icon: MapPinned },
];

/**
 * Ko'rsatkich plitkalari (bosilsa grafik shu ko'rsatkichga o'tadi), kunlik grafik va jadval.
 * Admin statistikasi, biznes tahriri va egasi hisobotida bir xil.
 */
export function StatsOverview({ series }: { series: StatsSeries }) {
  const t = useTranslations("Stats");
  const locale = useLocale();
  const [metric, setMetric] = useState<StatsMetric>("profileViews");
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="space-y-4">
      <div
        role="group"
        aria-label={t("metricsLabel")}
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {METRICS.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-pressed={metric === key}
            onClick={() => setMetric(key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              metric === key ? "border-primary bg-primary-soft" : "hover:bg-muted",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon aria-hidden="true" className="size-4" />
              {t(`metrics.${key}`)}
            </span>
            <span className="mt-1 block text-2xl font-semibold tabular-nums">
              {groupDigits(series.totals[key])}
            </span>
          </button>
        ))}
      </div>

      <section aria-labelledby="stats-chart-title" className="space-y-2 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="stats-chart-title" className="font-medium">
            {t("chartTitle", { metric: t(`metrics.${metric}`) })}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={showTable}
            onClick={() => setShowTable((value) => !value)}
          >
            <Table2 aria-hidden="true" />
            {showTable ? t("showChart") : t("showTable")}
          </Button>
        </div>
        {showTable ? (
          // Aylantiriladigan hudud klaviatura bilan ham ochilishi kerak (WCAG 2.1.1)
          <div
            role="region"
            aria-label={t("tableCaption")}
            tabIndex={0}
            className="max-h-80 overflow-auto rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <table className="w-full text-sm">
              <caption className="sr-only">{t("tableCaption")}</caption>
              <thead className="sticky top-0 bg-background text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1.5 pr-3 font-medium">
                    {t("date")}
                  </th>
                  {METRICS.map(({ key }) => (
                    <th key={key} scope="col" className="py-1.5 pr-3 text-right font-medium">
                      {t(`metrics.${key}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y tabular-nums">
                {series.daily
                  .slice()
                  .reverse()
                  .map((day) => (
                    <tr key={day.date}>
                      <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                        {formatShortDay(day.date, locale)}
                      </th>
                      {METRICS.map(({ key }) => (
                        <td key={key} className="py-1.5 pr-3 text-right">
                          {groupDigits(day[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StatsChart
            daily={series.daily}
            metric={metric}
            label={t("chartLabel", {
              metric: t(`metrics.${metric}`),
              from: formatShortDay(series.from, locale),
              to: formatShortDay(series.to, locale),
              total: groupDigits(series.totals[metric]),
            })}
          />
        )}
      </section>
    </div>
  );
}

/** Davr tanlash: 7 / 30 / 90 kun */
export function PeriodChips({
  value,
  onChange,
}: {
  value: number;
  onChange: (days: number) => void;
}) {
  const t = useTranslations("Stats");
  return (
    <div role="group" aria-label={t("periodLabel")} className="flex gap-2">
      {[7, 30, 90].map((days) => (
        <button
          key={days}
          type="button"
          aria-pressed={value === days}
          onClick={() => onChange(days)}
          className={cn(
            "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            value === days ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {t("days", { count: days })}
        </button>
      ))}
    </div>
  );
}
