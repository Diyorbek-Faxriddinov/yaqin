import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { CategoryManager } from "@/features/admin/components/category-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.categories");
  return { title: t("title") };
}

export default function AdminCategoriesPage() {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/kategoriyalar" permission="category.manage">
        <CategoryManager />
      </AdminGate>
    </Suspense>
  );
}
