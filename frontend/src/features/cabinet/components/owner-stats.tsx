"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodChips, StatsOverview } from "@/features/stats/components/stats-overview";
import { isDemoMode } from "@/lib/env";
import { useOwnedBusinessStats } from "../use-cabinet";

type Days = 7 | 30 | 90;

/** Egasi uchun statistika — admin bo'limi bilan bir xil ko'rinish, shaxsiy maʼlumotsiz */
export function OwnerStats({ businessId }: { businessId: string }) {
  const t = useTranslations("Cabinet.stats");
  const tAdmin = useTranslations("Admin.stats");
  const [days, setDays] = useState<Days>(30);
  const { data, isPending } = useOwnedBusinessStats(businessId, days);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      {isDemoMode && (
        <Alert>
          <AlertDescription>{tAdmin("demoNote")}</AlertDescription>
        </Alert>
      )}
      <PeriodChips value={days} onChange={(value) => setDays(value as Days)} />
      {isPending || !data ? <Skeleton className="h-80" /> : <StatsOverview series={data} />}
    </div>
  );
}
