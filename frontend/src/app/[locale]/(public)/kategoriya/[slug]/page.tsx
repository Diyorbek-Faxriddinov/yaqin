import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs, type Crumb } from "@/components/common/breadcrumbs";
import {
  BusinessResults,
  BusinessResultsSkeleton,
} from "@/features/business/components/business-results";
import { getCategory, getCategoryTree } from "@/features/category/queries";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/** Barcha kategoriya sahifalari build vaqtida tayyorlanadi; natijalar esa so'rov vaqtida */
export async function generateStaticParams() {
  const tree = await getCategoryTree("uz");
  return tree.flatMap((root) => [root, ...root.children]).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/kategoriya/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const category = await getCategory(slug, locale);
  if (!category) return {};
  const t = await getTranslations("CategoryPage");
  return {
    title: category.name,
    description: t("metaDescription", { name: category.name }),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/kategoriya/[slug]">) {
  const { slug } = await params;
  const locale = (await getLocale()) as AppLocale;
  const category = await getCategory(slug, locale);
  if (!category) notFound();

  const t = await getTranslations("CategoryPage");
  const tNav = await getTranslations("Nav");

  // Ichki kategoriyalar: ota kategoriyada — bolalari, oxirgi darajada — "qo'shnilari"
  const parentForChips = category.children.length > 0 ? category : category.parent;
  const siblings =
    category.children.length > 0
      ? category.children
      : category.parent
        ? ((await getCategory(category.parent.slug, locale))?.children ?? [])
        : [];

  const crumbs: Crumb[] = [
    { label: tNav("home"), href: "/" },
    { label: tNav("categories"), href: "/kategoriyalar" },
    ...(category.parent
      ? [{ label: category.parent.name, href: `/kategoriya/${category.parent.slug}` }]
      : []),
    { label: category.name },
  ];

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "hover:border-primary hover:bg-primary-soft hover:text-primary-soft-foreground",
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="space-y-3">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-3xl font-semibold">{category.name}</h1>
      </div>

      {siblings.length > 0 && parentForChips && (
        <nav aria-label={parentForChips.name}>
          <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <li>
              <Link
                href={`/kategoriya/${parentForChips.slug}`}
                aria-current={category.slug === parentForChips.slug ? "page" : undefined}
                className={chipClass(category.slug === parentForChips.slug)}
              >
                {t("all")}
              </Link>
            </li>
            {siblings.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/kategoriya/${child.slug}`}
                  aria-current={child.slug === category.slug ? "page" : undefined}
                  className={chipClass(child.slug === category.slug)}
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <Suspense fallback={<BusinessResultsSkeleton />}>
        <BusinessResults
          searchParams={searchParams}
          basePath={`/kategoriya/${category.slug}`}
          category={category.slug}
        />
      </Suspense>
    </div>
  );
}
