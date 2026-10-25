import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Pagination } from "@/components/common/pagination";
import { RetryButton } from "@/components/common/retry-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryTree, getDistricts } from "@/features/category/queries";
import { NearbyButton } from "@/features/location/components/nearby-button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { ApiRequestError } from "@/lib/api/server";
import type { BusinessPage } from "@/lib/api/types";
import { LOCATION_COOKIE, parseLocation } from "@/lib/location";
import { searchBusinesses } from "../queries";
import { filtersToQuery, parseFilters, withFilter, PAGE_SIZE } from "../search-params";
import { BusinessGrid, BusinessGridSkeleton } from "./business-card";
import { BusinessFilters } from "./business-filters";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Filtrlar + natijalar + sahifalash. URL parametrlari va joylashuv cookie'siga bog'liq,
 * shuning uchun so'rov vaqtida render qilinadi (sahifada Suspense ichida).
 */
export async function BusinessResults({
  searchParams,
  basePath,
  category,
}: {
  searchParams: Promise<SearchParams>;
  basePath: string;
  /** Kategoriya sahifasida — yo'ldan; qidiruv sahifasida undefined (URL'dan olinadi) */
  category?: string;
}) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("Results");
  const tFilters = await getTranslations("Filters");
  const tLocation = await getTranslations("Location");

  const parsed = parseFilters(await searchParams);
  const filters = category ? { ...parsed, category } : parsed;
  // Kategoriya sahifasida kategoriya URL so'roviga yozilmaydi (u yo'lda)
  const urlFilters = category ? { ...filters, category: null } : filters;
  const origin = parseLocation((await cookies()).get(LOCATION_COOKIE)?.value);

  const [districts, categoryTree] = await Promise.all([
    getDistricts(locale),
    category ? Promise.resolve(null) : getCategoryTree(locale),
  ]);

  const filterBar = (
    <BusinessFilters
      filters={urlFilters}
      basePath={basePath}
      districts={districts.map(({ slug, name }) => ({ slug, name }))}
      categories={categoryTree?.map(({ slug, name }) => ({ slug, name }))}
      hasLocation={origin !== null}
    />
  );

  let page: BusinessPage;
  try {
    page = await searchBusinesses(filters, locale, origin);
  } catch (error) {
    if (!(error instanceof ApiRequestError)) throw error;
    const tStates = await getTranslations("States");
    return (
      <div className="space-y-6">
        {filterBar}
        <ErrorState
          title={tStates("errorTitle")}
          description={tStates("errorDescription")}
          action={<RetryButton />}
        />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(page.total / PAGE_SIZE));
  const hasActiveFilters = Boolean(
    urlFilters.district || urlFilters.openNow || urlFilters.q || urlFilters.category,
  );

  return (
    <div className="space-y-6">
      {filterBar}

      {filters.sort === "distance" && !origin && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{tLocation("needForDistance")}</span>
            <NearbyButton href={`${basePath}${withFilter(urlFilters, { sort: "distance" })}`} />
          </AlertDescription>
        </Alert>
      )}

      <p role="status" className="text-sm text-muted-foreground">
        {t("count", { count: page.total })}
      </p>

      {page.items.length > 0 ? (
        <BusinessGrid businesses={page.items} />
      ) : (
        <EmptyState
          title={t("emptyTitle")}
          description={hasActiveFilters ? t("emptyFiltered") : t("emptyCategory")}
          action={
            hasActiveFilters ? (
              <Button asChild variant="outline">
                <Link href={basePath}>{tFilters("reset")}</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      <Pagination
        page={Math.min(filters.page, totalPages)}
        totalPages={totalPages}
        hrefForPage={(n) => `${basePath}${filtersToQuery({ ...urlFilters, page: n })}`}
      />
    </div>
  );
}

export function BusinessResultsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="hidden gap-4 md:flex">
        {[176, 192, 160].map((width) => (
          <Skeleton key={width} className="h-10" style={{ width }} />
        ))}
      </div>
      <Skeleton className="h-10 md:hidden" />
      <Skeleton className="h-4 w-24" />
      <BusinessGridSkeleton />
    </div>
  );
}
