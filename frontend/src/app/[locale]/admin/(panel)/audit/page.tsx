import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { AuditLog } from "@/features/admin/components/audit-log";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.audit");
  return { title: t("title") };
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/audit" permission="audit.view">
        <AuditLog />
      </AdminGate>
    </Suspense>
  );
}
