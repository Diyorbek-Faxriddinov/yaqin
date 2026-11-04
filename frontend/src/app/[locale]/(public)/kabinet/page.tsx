import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { OwnedBusinessList } from "@/features/cabinet/components/owned-business-list";

export default async function CabinetPage() {
  const t = await getTranslations("Cabinet");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t("listTitle")}</h1>
      <Suspense fallback={<Skeleton className="h-40" />}>
        <AuthGate path="/kabinet">
          <OwnedBusinessList />
        </AuthGate>
      </Suspense>
    </div>
  );
}
