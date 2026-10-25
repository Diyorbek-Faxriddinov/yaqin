import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Pagination } from "@/components/common/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewList } from "@/features/business/components/review-list";
import { getBusiness, getBusinessReviews } from "@/features/business/queries";
import type { AppLocale } from "@/i18n/routing";

const PAGE_SIZE = 20;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/biznes/[slug]/sharhlar">): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusiness(slug, (await getLocale()) as AppLocale);
  if (!business) return {};
  const t = await getTranslations("BusinessPage");
  return { title: t("reviewsPageTitle", { name: business.name }) };
}

/** Sahifa raqami URL'da — so'rov vaqtida render qilinadi */
async function ReviewsPageContent({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams: PageProps<"/[locale]/biznes/[slug]/sharhlar">["searchParams"];
}) {
  const raw = (await searchParams).sahifa;
  const requested = Number.parseInt(Array.isArray(raw) ? (raw[0] ?? "1") : (raw ?? "1"), 10);
  const page = Number.isInteger(requested) && requested >= 1 ? requested : 1;
  const reviews = await getBusinessReviews(slug, page, PAGE_SIZE);
  if (!reviews) notFound();
  const totalPages = Math.max(1, Math.ceil(reviews.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <ReviewList reviews={reviews.items} />
      <Pagination
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
        hrefForPage={(n) => `/biznes/${slug}/sharhlar${n > 1 ? `?sahifa=${n}` : ""}`}
      />
    </div>
  );
}

export default async function BusinessReviewsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/biznes/[slug]/sharhlar">) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const business = await getBusiness(slug, locale);
  if (!business) notFound();

  const t = await getTranslations("BusinessPage");
  const tNav = await getTranslations("Nav");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: business.name, href: `/biznes/${slug}` },
          { label: t("sections.reviews") },
        ]}
      />
      <h1 className="text-2xl font-semibold sm:text-3xl">
        {t("reviewsPageTitle", { name: business.name })}
      </h1>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ReviewsPageContent slug={slug} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
