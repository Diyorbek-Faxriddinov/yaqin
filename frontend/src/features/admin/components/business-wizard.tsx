"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { BUSINESS_SECTIONS } from "../admin-params";
import { useAdminBusiness } from "../use-admin-business";
import { BasicSection } from "./sections/basic-section";
import { CatalogSection } from "./sections/catalog-section";
import { ContactsSection } from "./sections/contacts-section";
import { HoursSection } from "./sections/hours-section";
import { LocationSection } from "./sections/location-section";
import { PhotosSection } from "./sections/photos-section";
import { StatusSection } from "./sections/status-section";

export const WIZARD_STEPS = BUSINESS_SECTIONS;
type Step = (typeof WIZARD_STEPS)[number];
const OPTIONAL: Step[] = ["photos", "hours", "catalog"];

/**
 * Do'konda turib, telefondan biznes qo'shish. 1-qadamda qoralama yaratiladi, keyingi har bir
 * qadam serverga saqlanadi; joriy qadam URL'da — sahifa yangilansa ham davom etadi.
 */
export function BusinessWizard({
  initialId,
  initialStep,
}: {
  initialId: string | null;
  initialStep: number;
}) {
  const t = useTranslations("Admin");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [id, setId] = useState(initialId);
  const [index, setIndex] = useState(
    initialId ? Math.min(Math.max(initialStep - 1, 1), WIZARD_STEPS.length - 1) : 0,
  );
  const { data: business, isPending } = useAdminBusiness(id);
  const step = WIZARD_STEPS[index]!;

  const goTo = (nextIndex: number, businessId = id) => {
    setIndex(nextIndex);
    if (businessId) {
      // Server so'rovisiz URL'ni yangilaymiz (qadam saqlanib qolishi uchun)
      const path = getPathname({ href: "/admin/bizneslar/yangi", locale });
      window.history.replaceState(null, "", `${path}?id=${businessId}&qadam=${nextIndex + 1}`);
    }
    window.scrollTo({ top: 0 });
  };
  const next = () => goTo(Math.min(index + 1, WIZARD_STEPS.length - 1));
  const finish = () => id && router.push(`/admin/bizneslar/${id}`);

  const sectionProps = business
    ? { business, canEdit: true, submitLabel: t("wizard.next"), onDone: next }
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">{business?.name ?? t("wizard.title")}</h1>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{t(`steps.${step}`)}</span>
            <span className="text-muted-foreground">
              {t("wizard.step", { current: index + 1, total: WIZARD_STEPS.length })}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t("wizard.title")}
            aria-valuemin={1}
            aria-valuemax={WIZARD_STEPS.length}
            aria-valuenow={index + 1}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${((index + 1) / WIZARD_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
        {index > 0 && <p className="text-sm text-muted-foreground">{t("wizard.draftNote")}</p>}
      </header>

      <section aria-label={t(`steps.${step}`)}>
        {step === "basic" ? (
          <BasicSection
            business={business ?? null}
            canEdit
            submitLabel={t("wizard.next")}
            onDone={(created) => {
              setId(created.id);
              goTo(1, created.id);
            }}
          />
        ) : !sectionProps || isPending ? (
          <Skeleton className="h-72" />
        ) : step === "location" ? (
          <LocationSection {...sectionProps} />
        ) : step === "photos" ? (
          <PhotosSection {...sectionProps} />
        ) : step === "hours" ? (
          <HoursSection {...sectionProps} />
        ) : step === "contacts" ? (
          <ContactsSection {...sectionProps} />
        ) : step === "catalog" ? (
          <CatalogSection {...sectionProps} />
        ) : (
          <StatusSection business={sectionProps.business} onDone={finish} />
        )}
      </section>

      {index > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
          <Button type="button" variant="ghost" onClick={() => goTo(index - 1)}>
            <ArrowLeft aria-hidden="true" />
            {t("wizard.back")}
          </Button>
          {OPTIONAL.includes(step) && (
            <Button type="button" variant="ghost" onClick={next}>
              {t("wizard.skip")}
            </Button>
          )}
          {step === "status" && (
            <Button type="button" variant="outline" onClick={finish}>
              {t("wizard.finish")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
