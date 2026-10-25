import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Logo } from "@/components/common/logo";
import { EmptyState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsOverview } from "@/features/stats/components/stats-overview";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { api, unwrapOrNull } from "@/lib/api/server";
import { isDemoMode } from "@/lib/env";
import { formatShortDay } from "@/lib/format/date";

const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Report");
  // Maxfiy havola: indekslanmaydi, tashqi saytlarga Referer orqali tushmaydi
  return { title: t("title"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

async function ReportContent({ params }: Pick<PageProps<"/[locale]/hisobot/[token]">, "params">) {
  await connection();
  const t = await getTranslations("Report");
  const locale = (await getLocale()) as AppLocale;
  const { token } = await params;
  const report = TOKEN.test(token)
    ? await unwrapOrNull(
        api.GET("/reports/{token}", { params: { path: { token }, query: { lang: locale } } }),
      )
    : null;

  if (!report) {
    return (
      <EmptyState
        headingLevel="h1"
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{t("eyebrow")}</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{report.business.name}</h1>
        <p className="text-muted-foreground">
          {report.business.categoryName} · {report.business.districtName}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("period", {
            from: formatShortDay(report.from, locale),
            to: formatShortDay(report.to, locale),
          })}
        </p>
      </div>
      {!report.business.isPublished && (
        <Alert>
          <AlertDescription>{t("notPublished")}</AlertDescription>
        </Alert>
      )}
      {isDemoMode && (
        <Alert>
          <AlertDescription>{t("demoNote")}</AlertDescription>
        </Alert>
      )}
      <StatsOverview series={report} />
      <p className="text-sm text-muted-foreground">{t("privacy")}</p>
    </div>
  );
}

/** Biznes egasi uchun hisobot: shaxsiy maʼlumotsiz, faqat ko'rish va bosishlar soni (ADR-0007) */
export default function OwnerReportPage({ params }: PageProps<"/[locale]/hisobot/[token]">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center px-4">
          <Link
            href="/"
            className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Logo />
          </Link>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <ReportContent params={params} />
        </Suspense>
      </main>
    </div>
  );
}
