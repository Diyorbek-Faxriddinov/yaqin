import { Suspense } from "react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { getMapMarkers } from "@/features/business/queries";
import { parseFilters } from "@/features/business/search-params";
import { getCategoryTree } from "@/features/category/queries";
import { MapExplorer } from "@/features/map/components/map-explorer";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MapPage");
  return { title: t("title"), description: t("description") };
}

async function MapContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/xarita">["searchParams"];
}) {
  const params = await searchParams;
  const locale = (await getLocale()) as AppLocale;
  const filters = parseFilters(params);
  const selected = typeof params.b === "string" ? params.b : null;

  const [markers, categories] = await Promise.all([
    getMapMarkers(filters, locale),
    getCategoryTree(locale),
  ]);

  return (
    <MapExplorer
      // Filtrlar o'zgarganda tanlov va holat qayta boshlanadi
      key={`${filters.category}-${filters.openNow}`}
      markers={markers}
      category={filters.category}
      openNow={filters.openNow}
      categories={categories.map(({ slug, name }) => ({ slug, name }))}
      initialSelected={selected}
      locale={locale}
    />
  );
}

export default function MapPage({ searchParams }: PageProps<"/[locale]/xarita">) {
  return (
    <Suspense fallback={<Skeleton className="h-[calc(100dvh-4rem)] rounded-none" />}>
      <MapContent searchParams={searchParams} />
    </Suspense>
  );
}
