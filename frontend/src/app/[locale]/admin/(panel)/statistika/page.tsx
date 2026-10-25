import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { StatsDashboard } from "@/features/admin/components/stats-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.stats");
  return { title: t("title") };
}

export default function AdminStatsPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl" />}>
      <AdminGate path="/admin/statistika" permission="stats.view">
        <StatsDashboard />
      </AdminGate>
    </Suspense>
  );
}
