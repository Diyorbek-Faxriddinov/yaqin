import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { parseListFilter } from "@/features/admin/admin-params";
import { AdminBusinessList } from "@/features/admin/components/business-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.list");
  return { title: t("title") };
}

async function ListContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/admin/bizneslar">["searchParams"];
}) {
  const raw = (await searchParams).filtr;
  return <AdminBusinessList initialFilter={parseListFilter(Array.isArray(raw) ? raw[0] : raw)} />;
}

export default function AdminBusinessesPage({
  searchParams,
}: PageProps<"/[locale]/admin/bizneslar">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-4xl" />}>
      <AdminGate path="/admin/bizneslar" permission="business.view">
        <ListContent searchParams={searchParams} />
      </AdminGate>
    </Suspense>
  );
}
