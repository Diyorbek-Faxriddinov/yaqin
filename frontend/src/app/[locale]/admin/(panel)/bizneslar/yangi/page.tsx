import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { BusinessWizard } from "@/features/admin/components/business-wizard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.wizard");
  return { title: t("title") };
}

const UUID = /^[0-9a-f-]{36}$/i;

async function WizardContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/admin/bizneslar/yangi">["searchParams"];
}) {
  const params = await searchParams;
  const id = typeof params.id === "string" && UUID.test(params.id) ? params.id : null;
  const step = Number.parseInt(typeof params.qadam === "string" ? params.qadam : "1", 10) || 1;
  return <BusinessWizard initialId={id} initialStep={step} />;
}

export default function NewBusinessPage({
  searchParams,
}: PageProps<"/[locale]/admin/bizneslar/yangi">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-2xl" />}>
      <AdminGate path="/admin/bizneslar/yangi" permission="business.edit">
        <WizardContent searchParams={searchParams} />
      </AdminGate>
    </Suspense>
  );
}
