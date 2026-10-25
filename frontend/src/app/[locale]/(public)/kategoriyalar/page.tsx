import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { CategoryIcon } from "@/features/category/category-icon";
import { getCategoryTree } from "@/features/category/queries";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CategoriesPage");
  return { title: t("title"), description: t("description") };
}

export default async function CategoriesPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("CategoriesPage");
  const tNav = await getTranslations("Nav");
  const categories = await getCategoryTree(locale);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      <div className="space-y-3">
        <Breadcrumbs items={[{ label: tNav("home"), href: "/" }, { label: t("title") }]} />
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <li key={category.id} className="rounded-xl border p-4">
            <Link
              href={`/kategoriya/${category.slug}`}
              className="group flex items-center gap-3 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <CategoryIcon iconKey={category.iconKey} className="size-6" />
              </span>
              <span>
                <span className="block font-semibold group-hover:underline">{category.name}</span>
                <span className="block text-sm text-muted-foreground">
                  {t("businessCount", { count: category.businessCount })}
                </span>
              </span>
            </Link>
            <ul className="mt-4 flex flex-wrap gap-2">
              {category.children.map((child) => (
                <li key={child.id}>
                  <Link
                    href={`/kategoriya/${child.slug}`}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-muted px-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {child.name}
                    <span className="text-muted-foreground tabular-nums">
                      {child.businessCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
