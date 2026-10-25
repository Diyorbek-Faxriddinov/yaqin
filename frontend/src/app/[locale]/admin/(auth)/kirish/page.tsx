import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLogin } from "@/features/admin/components/admin-login";
import { isDemoMode } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.login");
  return { title: t("title") };
}

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/admin/kirish">["searchParams"];
}) {
  const raw = (await searchParams).next;
  const next = safeNextPath(Array.isArray(raw) ? raw[0] : raw, "/admin");
  // Admin kirishidan keyin faqat admin bo'limiga qaytiladi
  return <AdminLogin next={next.startsWith("/admin") ? next : "/admin"} demoMode={isDemoMode} />;
}

export default function AdminLoginPage({ searchParams }: PageProps<"/[locale]/admin/kirish">) {
  return (
    <main id="main" className="flex flex-1 items-center px-4 py-12">
      <Suspense fallback={<Skeleton className="mx-auto h-80 w-full max-w-sm" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
