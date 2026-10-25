import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SearchForm } from "@/components/common/search-form";
import {
  BusinessResults,
  BusinessResultsSkeleton,
} from "@/features/business/components/business-results";
import { parseFilters } from "@/features/business/search-params";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SearchPage");
  // Qidiruv natijalari sahifalari indekslanmaydi — kategoriya sahifalari indekslanadi
  return { title: t("title"), robots: { index: false, follow: true } };
}

/** So'rov matni bilan sarlavha va forma — URL'ga bog'liq, shuning uchun alohida Suspense ichida */
async function SearchHeader({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/qidiruv">["searchParams"];
}) {
  const t = await getTranslations("SearchPage");
  const { q } = parseFilters(await searchParams);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold sm:text-3xl">
        {q ? t("resultsFor", { q }) : t("title")}
      </h1>
      <SearchForm id="page-search" defaultValue={q} className="max-w-2xl" />
      {!q && <p className="text-sm text-muted-foreground">{t("hint")}</p>}
    </div>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/[locale]/qidiruv">) {
  const t = await getTranslations("SearchPage");

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Suspense fallback={<h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>}>
        <SearchHeader searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<BusinessResultsSkeleton />}>
        <BusinessResults searchParams={searchParams} basePath="/qidiruv" />
      </Suspense>
    </div>
  );
}
