import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { SettingsForm } from "@/features/admin/components/settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.settings");
  return { title: t("title") };
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-2xl" />}>
      <AdminGate path="/admin/sozlamalar" permission="settings.manage">
        <SettingsForm />
      </AdminGate>
    </Suspense>
  );
}
