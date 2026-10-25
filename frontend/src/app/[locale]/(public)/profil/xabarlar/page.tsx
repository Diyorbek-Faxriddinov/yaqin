import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { MyComplaintsList } from "@/features/complaints/components/my-complaints-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile.nav");
  return { title: t("complaints"), robots: { index: false, follow: false } };
}

export default async function MyComplaintsPage() {
  const t = await getTranslations("Profile.nav");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t("complaints")}</h1>
      <Suspense fallback={<Skeleton className="h-48" />}>
        <AuthGate path="/profil/xabarlar">
          <MyComplaintsList />
        </AuthGate>
      </Suspense>
    </div>
  );
}
