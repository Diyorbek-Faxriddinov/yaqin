import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { EmptyState } from "@/components/common/states";
import { getDistricts } from "@/features/category/queries";
import { BusinessRequestForm } from "@/features/requests/components/business-request-form";
import { getPublicSettings } from "@/features/settings/queries";
import type { AppLocale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AddBusiness");
  const locale = (await getLocale()) as AppLocale;
  return pageMetadata({
    path: "/biznes-qoshish",
    locale,
    title: t("title"),
    description: t("lead"),
  });
}

export default async function AddBusinessPage() {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("AddBusiness");
  const tNav = await getTranslations("Nav");
  const [settings, districts] = await Promise.all([getPublicSettings(), getDistricts(locale)]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div className="space-y-3">
        <Breadcrumbs items={[{ label: tNav("home"), href: "/" }, { label: t("title") }]} />
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("lead")}</p>
        <ul className="space-y-1.5 pt-1">
          {(["free", "visit", "consent"] as const).map((key) => (
            <li key={key} className="flex gap-2 text-sm">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              {t(`points.${key}`)}
            </li>
          ))}
        </ul>
      </div>

      {settings.businessRequestsOpen ? (
        <BusinessRequestForm districts={districts} />
      ) : (
        <EmptyState title={t("closed.title")} description={t("closed.text")} />
      )}
    </div>
  );
}
