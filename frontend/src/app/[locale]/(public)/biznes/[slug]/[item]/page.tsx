import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { MediaGallery } from "@/components/common/media-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BusinessOpenStatus } from "@/features/business/components/business-open-status";
import { ContactActions } from "@/features/business/components/contact-actions";
import { ItemJsonLd } from "@/features/business/components/item-json-ld";
import { ItemPriceText } from "@/features/business/components/item-list";
import { getBusiness, getBusinessItem, getBusinessItems } from "@/features/business/queries";
import { CategoryIcon } from "@/features/category/category-icon";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatDuration } from "@/lib/format/duration";
import { pageMetadata } from "@/lib/seo";
import { atLeastOne } from "@/lib/static-params";

/** Ota layout har bir biznes uchun chaqiradi — bu yerda faqat mahsulot slug'lari */
export async function generateStaticParams({ params }: { params: { slug: string } }) {
  return atLeastOne(
    (await getBusinessItems(params.slug, "uz")).map((item) => ({ item: item.slug })),
    "item",
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/biznes/[slug]/[item]">): Promise<Metadata> {
  const { slug, item: itemSlug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const [business, item] = await Promise.all([
    getBusiness(slug, locale),
    getBusinessItem(slug, itemSlug, locale),
  ]);
  if (!business || !item) return {};
  const t = await getTranslations("BusinessPage.item");
  return pageMetadata({
    path: `/biznes/${slug}/${itemSlug}`,
    locale,
    title: `${item.name} — ${business.name}`,
    description: t("metaDescription", {
      item: item.name,
      business: business.name,
      district: business.district.name,
    }),
    image: item.images[0] ?? business.coverImage ?? undefined,
  });
}

export default async function ItemPage({ params }: PageProps<"/[locale]/biznes/[slug]/[item]">) {
  const { slug, item: itemSlug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const [business, item] = await Promise.all([
    getBusiness(slug, locale),
    getBusinessItem(slug, itemSlug, locale),
  ]);
  if (!business || !item) notFound();

  const t = await getTranslations("BusinessPage");
  const tNav = await getTranslations("Nav");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pageUrl = `${siteUrl}${getPathname({ href: `/biznes/${slug}/${itemSlug}`, locale })}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <ItemJsonLd item={item} business={business} url={pageUrl} siteUrl={siteUrl} />
      <Breadcrumbs
        items={[
          { label: tNav("home"), href: "/" },
          { label: business.name, href: `/biznes/${slug}` },
          { label: item.name },
        ]}
      />

      <article className="space-y-6">
        <MediaGallery
          images={item.images}
          name={item.name}
          priority
          className={item.images.length > 0 ? "h-72 sm:h-96" : "h-40"}
          placeholder={<CategoryIcon iconKey={business.category.iconKey} className="size-12" />}
        />

        <header className="space-y-3">
          <Badge variant="secondary">{t(`item.${item.kind}`)}</Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">{item.name}</h1>
          <ItemPriceText price={item.price} className="text-xl" />
          {!item.isAvailable && <p className="text-sm text-warning">{t("unavailable")}</p>}
        </header>

        {item.description && <p className="whitespace-pre-line">{item.description}</p>}

        {(item.durationMinutes != null || item.attributes.length > 0) && (
          <section aria-labelledby="item-details" className="space-y-3">
            <h2 id="item-details" className="text-lg font-semibold">
              {t("item.details")}
            </h2>
            <dl className="divide-y rounded-xl border">
              {item.durationMinutes != null && (
                <div className="flex justify-between gap-4 p-3">
                  <dt className="inline-flex items-center gap-2 text-muted-foreground">
                    <Clock aria-hidden="true" className="size-4" />
                    {t("item.duration")}
                  </dt>
                  <dd className="font-medium">{formatDuration(item.durationMinutes, locale)}</dd>
                </div>
              )}
              {item.attributes.map((attribute) => (
                <div key={attribute.key} className="flex justify-between gap-4 p-3">
                  <dt className="text-muted-foreground">{attribute.name}</dt>
                  <dd className="text-right font-medium">{attribute.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section aria-labelledby="item-business" className="space-y-4 rounded-2xl border p-4">
          <div>
            <p id="item-business" className="text-sm text-muted-foreground">
              {t("item.offeredBy")}
            </p>
            <Link
              href={`/biznes/${slug}`}
              className="text-lg font-semibold underline-offset-4 hover:underline"
            >
              {business.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {business.category.name} · {business.district.name}
            </p>
            <div className="mt-2">
              <BusinessOpenStatus schedule={business.schedule} />
            </div>
          </div>
          <ContactActions
            id={business.id}
            name={business.name}
            phones={business.phones}
            telegram={business.telegram}
            location={business.location}
          />
        </section>
      </article>

      <Button asChild variant="ghost">
        <Link href={`/biznes/${slug}`}>
          <ArrowLeft aria-hidden="true" />
          {t("backToBusiness", { name: business.name })}
        </Link>
      </Button>
    </div>
  );
}
