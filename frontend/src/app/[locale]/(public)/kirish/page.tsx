import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginPanel } from "@/features/auth/components/login-panel";
import { isDemoLoginEnabled } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("title"), robots: { index: false, follow: false } };
}

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/kirish">["searchParams"];
}) {
  const raw = (await searchParams).next;
  // Faqat o'z saytimiz ichidagi manzil (open redirect himoyasi)
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw);
  return <LoginPanel next={next} demoMode={isDemoLoginEnabled} />;
}

export default function LoginPage({ searchParams }: PageProps<"/[locale]/kirish">) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-12">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
