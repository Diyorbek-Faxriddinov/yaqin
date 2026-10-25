import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { MyReviewsList } from "@/features/reviews/components/my-reviews-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile.nav");
  return { title: t("reviews"), robots: { index: false, follow: false } };
}

export default async function MyReviewsPage() {
  const t = await getTranslations("Profile.nav");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t("reviews")}</h1>
      <Suspense fallback={<Skeleton className="h-48" />}>
        <AuthGate path="/profil/sharhlar">
          <MyReviewsList />
        </AuthGate>
      </Suspense>
    </div>
  );
}
