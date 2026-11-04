import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { ChangeReview } from "@/features/admin/components/change-review";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.changes");
  return { title: t("title") };
}

const UUID = /^[0-9a-f-]{36}$/i;

async function Content({ params }: Pick<PageProps<"/[locale]/admin/takliflar/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <ChangeReview id={id} />;
}

export default function AdminChangePage({ params }: PageProps<"/[locale]/admin/takliflar/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/takliflar" permission="change.review">
        <Content params={params} />
      </AdminGate>
    </Suspense>
  );
}
