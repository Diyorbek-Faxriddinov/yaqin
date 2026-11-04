import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { firstParam, parseChangeFilter } from "@/features/admin/admin-params";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { ChangeQueue } from "@/features/admin/components/change-queue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.changes");
  return { title: t("title") };
}

const UUID = /^[0-9a-f-]{36}$/i;

async function Content({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/takliflar">, "searchParams">) {
  const params = await searchParams;
  const business = firstParam(params.biznes);
  return (
    <ChangeQueue
      initialFilter={parseChangeFilter(firstParam(params.filtr))}
      businessId={business && UUID.test(business) ? business : null}
    />
  );
}

export default function AdminChangesPage({ searchParams }: PageProps<"/[locale]/admin/takliflar">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/takliflar" permission="change.review">
        <Content searchParams={searchParams} />
      </AdminGate>
    </Suspense>
  );
}
