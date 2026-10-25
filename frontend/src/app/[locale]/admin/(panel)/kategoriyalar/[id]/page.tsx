import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { CategoryAttributes } from "@/features/admin/components/category-attributes";

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.attributes");
  return { title: t("metaTitle") };
}

async function Content({
  params,
}: Pick<PageProps<"/[locale]/admin/kategoriyalar/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <CategoryAttributes id={id} />;
}

export default function AdminCategoryAttributesPage({
  params,
}: PageProps<"/[locale]/admin/kategoriyalar/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/kategoriyalar" permission="category.manage">
        <Content params={params} />
      </AdminGate>
    </Suspense>
  );
}
