import { Suspense } from "react";
import type { Metadata } from "next";
import { ArrowRight, Store } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { SearchForm } from "@/components/common/search-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BusinessCard, BusinessCardSkeleton } from "@/features/business/components/business-card";
import { getNewestBusinesses } from "@/features/business/queries";
import { CategoryTile } from "@/features/category/components/category-tile";
import { getCategoryTree, getDistricts } from "@/features/category/queries";
import { NearbyButton } from "@/features/location/components/nearby-button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { absoluteUrl, pageMetadata } from "@/lib/seo";

function SectionHeader({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 id={id} className="text-xl font-semibold sm:text-2xl">
        {title}
      </h2>
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {linkLabel}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </div>
  );
}

async function Categories({ locale }: { locale: AppLocale }) {
  const categories = await getCategoryTree(locale);
  return (
    <ul className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-6">
      {categories.map((category) => (
        <li key={category.id}>
          <CategoryTile
            href={`/kategoriya/${category.slug}`}
            name={category.name}
            iconKey={category.iconKey}
          />
        </li>
      ))}
    </ul>
  );
}

async function NewestBusinesses({ locale }: { locale: AppLocale }) {
  const businesses = await getNewestBusinesses(locale);
  return (
    // Telefonda gorizontal aylantiriladigan qator, kattaroq ekranda to'r
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {businesses.map((business) => (
        <li key={business.id} className="flex w-[72%] shrink-0 snap-start sm:w-auto">
          <BusinessCard business={business} className="w-full" />
        </li>
      ))}
    </ul>
  );
}

async function Districts({ locale }: { locale: AppLocale }) {
  const districts = await getDistricts(locale);
  return (
    <ul className="flex flex-wrap gap-2">
      {districts.map((district) => (
        <li key={district.id}>
          <Link
            href={`/qidiruv?tuman=${district.slug}`}
            className="inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary-soft-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {district.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({ path: "/", locale: (await getLocale()) as AppLocale });
}

/** schema.org WebSite + SearchAction — qidiruv tizimida sayt ichida qidirish maydoni */
function WebsiteJsonLd({ locale }: { locale: AppLocale }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Yaqin",
    url: absoluteUrl("/", locale),
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: `${absoluteUrl("/qidiruv", locale)}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default async function HomePage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("HomePage");

  return (
    <>
      <WebsiteJsonLd locale={locale} />
      <section className="border-b bg-gradient-to-b from-primary-soft to-background">
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-12 text-center sm:pt-16 sm:pb-16">
          <h1 className="text-3xl font-bold sm:text-5xl">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            {t("subtitle")}
          </p>
          <SearchForm id="hero-search" size="lg" className="mx-auto mt-8 max-w-2xl" />
          <NearbyButton href="/qidiruv?saralash=yaqin" variant="secondary" className="mt-4" />
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        <section aria-labelledby="home-categories">
          <SectionHeader
            id="home-categories"
            title={t("categoriesTitle")}
            href="/kategoriyalar"
            linkLabel={t("allCategories")}
          />
          <Suspense
            fallback={
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: 12 }, (_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            }
          >
            <Categories locale={locale} />
          </Suspense>
        </section>

        <section aria-labelledby="home-newest">
          <SectionHeader id="home-newest" title={t("newestTitle")} />
          <Suspense
            fallback={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <BusinessCardSkeleton key={i} />
                ))}
              </div>
            }
          >
            <NewestBusinesses locale={locale} />
          </Suspense>
        </section>

        <section aria-labelledby="home-districts">
          <SectionHeader id="home-districts" title={t("districtsTitle")} />
          <Suspense fallback={<Skeleton className="h-24" />}>
            <Districts locale={locale} />
          </Suspense>
        </section>

        <section className="flex flex-col items-start gap-4 rounded-2xl bg-primary px-6 py-8 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <div className="flex items-start gap-4">
            <Store aria-hidden="true" className="mt-1 size-8 shrink-0" />
            <div>
              <h2 className="text-xl font-semibold">{t("addBusinessTitle")}</h2>
              <p className="mt-1 text-primary-foreground/90">{t("addBusinessText")}</p>
            </div>
          </div>
          <Button asChild variant="secondary" size="lg">
            <Link href="/biznes-qoshish">{t("addBusinessCta")}</Link>
          </Button>
        </section>
      </div>
    </>
  );
}
