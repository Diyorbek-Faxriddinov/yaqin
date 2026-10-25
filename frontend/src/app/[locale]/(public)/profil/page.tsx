import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthGate } from "@/features/auth/components/auth-gate";
import { ProfileOverview } from "@/features/auth/components/profile-overview";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Profile");
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<Skeleton className="h-64" />}>
      <AuthGate path="/profil">
        <ProfileOverview />
      </AuthGate>
    </Suspense>
  );
}
