import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { firstParam, parseRequestFilter } from "@/features/admin/admin-params";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { RequestQueue } from "@/features/admin/components/request-queue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.requests");
  return { title: t("title") };
}

async function Content({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/sorovlar">, "searchParams">) {
  const filter = parseRequestFilter(firstParam((await searchParams).filtr));
  return <RequestQueue initialFilter={filter} />;
}

// So'rovlarda telefon raqamlari bor — faqat biznes qo'sha oladigan administratorlarga
export default function AdminRequestsPage({ searchParams }: PageProps<"/[locale]/admin/sorovlar">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/sorovlar" permission="business.edit">
        <Content searchParams={searchParams} />
      </AdminGate>
    </Suspense>
  );
}
