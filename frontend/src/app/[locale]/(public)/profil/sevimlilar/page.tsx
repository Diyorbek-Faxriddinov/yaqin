import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BusinessGridSkeleton } from "@/features/business/components/business-card";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { FavoritesList } from "@/features/favorites/components/favorites-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile.nav");
  return { title: t("favorites"), robots: { index: false, follow: false } };
}

export default async function FavoritesPage() {
  const t = await getTranslations("Profile.nav");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{t("favorites")}</h1>
      <Suspense fallback={<BusinessGridSkeleton count={3} />}>
        <AuthGate path="/profil/sevimlilar">
          <FavoritesList />
        </AuthGate>
      </Suspense>
    </div>
  );
}
