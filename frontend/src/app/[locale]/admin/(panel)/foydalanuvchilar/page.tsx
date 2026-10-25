import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { firstParam, parseUserFilter } from "@/features/admin/admin-params";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { UserList } from "@/features/admin/components/user-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.users");
  return { title: t("title") };
}

async function Content({
  searchParams,
}: Pick<PageProps<"/[locale]/admin/foydalanuvchilar">, "searchParams">) {
  const filter = parseUserFilter(firstParam((await searchParams).filtr));
  return <UserList initialFilter={filter} />;
}

export default function AdminUsersPage({
  searchParams,
}: PageProps<"/[locale]/admin/foydalanuvchilar">) {
  return (
    <Suspense fallback={<Skeleton className="mx-auto h-96 max-w-3xl" />}>
      <AdminGate path="/admin/foydalanuvchilar" permission="user.view">
        <Content searchParams={searchParams} />
      </AdminGate>
    </Suspense>
  );
}
