import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { firstParam } from "@/features/admin/admin-params";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { StaffManager } from "@/features/admin/components/staff-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.staff");
  return { title: t("title") };
}

async function Content({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/administratorlar">, "searchParams">) {
  const section = firstParam((await searchParams).bolim) === "rollar" ? "roles" : "admins";
  return <StaffManager initialSection={section} />;
}

// Ko'rish — staff.manage; o'zgartirish — faqat Root (API tekshiradi, ADR-0009)
export default function AdminStaffPage({
  searchParams,
}: PageProps<"/[locale]/admin/administratorlar">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/administratorlar" permission="staff.manage">
        <Content searchParams={searchParams} />
      </AdminGate>
    </Suspense>
  );
}
