import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs, type Crumb } from "@/components/common/breadcrumbs";
import { Button } from "@/components/ui/button";
import { BusinessJsonLd } from "@/features/business/components/business-json-ld";
import { BusinessOpenStatus } from "@/features/business/components/business-open-status";
import { ContactActions, TrackProfileView } from "@/features/business/components/contact-actions";
import { ItemList } from "@/features/business/components/item-list";
import { PriceTag } from "@/features/business/components/price-tag";
import { RatingStars } from "@/features/business/components/rating";
import { ReviewList } from "@/features/business/components/review-list";
import { WeeklyHours } from "@/features/business/components/weekly-hours";
import { getBusiness, getBusinessItems, getBusinessReviews } from "@/features/business/queries";
import { CategoryIcon } from "@/features/category/category-icon";
import { getCategory } from "@/features/category/queries";
import { MapWhenVisible } from "@/features/map/components/lazy-map";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format/number";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/biznes/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const business = await getBusiness(slug, locale);
  if (!business) return {};
  const t = await getTranslations("BusinessPage");
  return {
    title: `${business.name} — ${business.category.name}`,
    description:
      business.description ??
      t("metaDescription", {
        name: business.name,
        category: business.category.name,
        district: business.district.name,
      }),
  };
}

function Section({
  id,
  title,
  children,
  aside,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 id={id} className="text-xl font-semibold">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default async function BusinessPage({ params }: PageProps<"/[locale]/biznes/[slug]">) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const business = await getBusiness(slug, locale);
  if (!business) notFound();

  const [items, reviews, category] = await Promise.all([
    getBusinessItems(slug, locale),
    getBusinessReviews(slug, 1, 5),
    getCategory(business.category.slug, locale),
  ]);

  const t = await getTranslations("BusinessPage");
  const tNav = await getTranslations("Nav");
  const tBusiness = await getTranslations("Business");

  const crumbs: Crumb[] = [
    { label: tNav("home"), href: "/" },
    ...(category?.parent
      ? [{ label: category.parent.name, href: `/kategoriya/${category.parent.slug}` }]
      : []),
    { label: business.category.name, href: `/kategoriya/${business.category.slug}` },
    { label: business.name },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pageUrl = `${siteUrl}${getPathname({ href: `/biznes/${slug}`, locale })}`;
  const cover = business.gallery[0] ?? business.coverImage;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <BusinessJsonLd business={business} url={pageUrl} />
      <TrackProfileView businessId={business.id} />

      <Breadcrumbs items={crumbs} />

      {/* Muqova: rasm yoki kategoriya ikonkasi */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-primary-soft">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- rasm CDN'i 3-bosqichda next/image bilan ulanadi
          <img src={cover.url} alt={cover.alt ?? ""} className="h-48 w-full object-cover sm:h-64" />
        ) : (
          <div className="flex h-32 items-center justify-center text-primary-soft-foreground/60 sm:h-44">
            <CategoryIcon iconKey={business.category.iconKey} className="size-14" />
          </div>
        )}
      </div>

      {/*
        Telefonda tartib: sarlavha va aloqa → narxlar → ish vaqti va manzil → sharhlar.
        Desktopda ish vaqti va manzil o'ng ustunda (yopishqoq).
      */}
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-10 lg:col-start-1">
          <header className="space-y-3">
            <div className="flex items-start gap-2">
              <h1 className="text-2xl font-bold sm:text-3xl">{business.name}</h1>
              {business.isVerified && (
                <BadgeCheck
                  aria-label={t("verifiedNote")}
                  className="mt-1.5 size-6 shrink-0 text-primary"
                />
              )}
            </div>
            <p className="text-muted-foreground">
              <Link
                href={`/kategoriya/${business.category.slug}`}
                className="underline-offset-4 hover:underline"
              >
                {business.category.name}
              </Link>{" "}
              · {business.district.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {business.rating.average != null && business.rating.count > 0 ? (
                <a href="#reviews" className="inline-flex items-center gap-2 text-sm">
                  <RatingStars value={business.rating.average} />
                  <span className="font-semibold">{formatDecimal(business.rating.average)}</span>
                  <span className="text-muted-foreground">
                    {tBusiness("reviews", { count: business.rating.count })}
                  </span>
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">{tBusiness("noReviews")}</span>
              )}
              <BusinessOpenStatus schedule={business.schedule} />
              {business.priceRange && <PriceTag price={business.priceRange} className="text-sm" />}
            </div>
          </header>

          <ContactActions
            id={business.id}
            name={business.name}
            phones={business.phones}
            telegram={business.telegram}
            location={business.location}
          />

          <Section id="prices" title={t("sections.prices")}>
            <ItemList items={items} businessSlug={slug} />
          </Section>
        </div>

        <aside className="space-y-10 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <Section id="hours" title={t("sections.hours")}>
            <WeeklyHours schedule={business.schedule} />
          </Section>

          <Section id="location" title={t("sections.location")}>
            <address className="space-y-1 not-italic">
              <p className="flex items-start gap-2">
                <MapPin
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                {business.address.text}
              </p>
              {business.address.landmark && (
                <p className="pl-6 text-sm text-muted-foreground">
                  {t("landmark", { landmark: business.address.landmark })}
                </p>
              )}
            </address>
            <MapWhenVisible
              points={[
                {
                  slug: business.slug,
                  name: business.name,
                  lat: business.location.lat,
                  lng: business.location.lng,
                },
              ]}
              selectedSlug={business.slug}
              center={business.location}
              zoom={15}
              cooperative
              label={t("mapLabel", { name: business.name })}
              className="h-56 rounded-xl border"
            />
            <Button asChild variant="outline" className="w-full">
              <Link href={`/xarita?b=${business.slug}`}>{t("openOnMap")}</Link>
            </Button>
          </Section>
        </aside>

        <div className="min-w-0 space-y-10 lg:col-start-1">
          <Section
            id="reviews"
            title={t("sections.reviews")}
            aside={
              reviews && reviews.total > reviews.items.length ? (
                <Link
                  href={`/biznes/${slug}/sharhlar`}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t("showAllReviews", { count: reviews.total })}
                </Link>
              ) : undefined
            }
          >
            <ReviewList reviews={reviews?.items ?? []} />
          </Section>

          {business.description && (
            <Section id="about" title={t("sections.about")}>
              <p className="whitespace-pre-line">{business.description}</p>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
