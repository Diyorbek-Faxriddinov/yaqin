import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { firstParam, parseComplaintFilter } from "@/features/admin/admin-params";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { ComplaintQueue } from "@/features/admin/components/complaint-queue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.complaints");
  return { title: t("title") };
}

async function Content({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/shikoyatlar">, "searchParams">) {
  const filter = parseComplaintFilter(firstParam((await searchParams).filtr));
  return <ComplaintQueue initialFilter={filter} />;
}

export default function AdminComplaintsPage({
  searchParams,
}: PageProps<"/[locale]/admin/shikoyatlar">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/shikoyatlar" permission="complaint.manage">
        <Content searchParams={searchParams} />
      </AdminGate>
    </Suspense>
  );
}
