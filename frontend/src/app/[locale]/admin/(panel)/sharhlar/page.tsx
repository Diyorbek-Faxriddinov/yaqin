import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { firstParam, parseReviewFilter } from "@/features/admin/admin-params";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { ReviewQueue } from "@/features/admin/components/review-queue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.reviews");
  return { title: t("title") };
}

async function Content({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/sharhlar">, "searchParams">) {
  const filter = parseReviewFilter(firstParam((await searchParams).filtr));
  return <ReviewQueue initialFilter={filter} />;
}

export default function AdminReviewsPage({ searchParams }: PageProps<"/[locale]/admin/sharhlar">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/sharhlar" permission="review.moderate">
        <Content searchParams={searchParams} />
      </AdminGate>
    </Suspense>
  );
}
