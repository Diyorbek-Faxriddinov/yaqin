"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPathname, Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { EDITOR_TABS, parseTab, type EditorTab } from "../admin-params";
import { useCan } from "../use-admin";
import { useAdminBusiness } from "../use-admin-business";
import { BasicSection } from "./sections/basic-section";
import { CatalogSection } from "./sections/catalog-section";
import { ContactsSection } from "./sections/contacts-section";
import { HoursSection } from "./sections/hours-section";
import { LocationSection } from "./sections/location-section";
import { PhotosSection } from "./sections/photos-section";
import { StatsSection } from "./sections/stats-section";
import { StatusSection } from "./sections/status-section";
import { BusinessStatusBadge } from "./status-badge";

type Tab = EditorTab;

export function BusinessEditor({ id, initialTab }: { id: string; initialTab: Tab }) {
  const t = useTranslations("Admin");
  const tStates = useTranslations("States");
  const locale = useLocale() as AppLocale;
  const canEdit = useCan("business.edit");
  const { data: business, isPending, isError } = useAdminBusiness(id);
  const [tab, setTab] = useState<Tab>(initialTab);

  if (isPending) return <Skeleton className="mx-auto h-96 max-w-3xl" />;
  if (isError || !business) {
    return <ErrorState title={tStates("errorTitle")} description={tStates("errorDescription")} />;
  }

  const saved = () => toast.success(t("edit.saved"));
  const props = { business, canEdit, submitLabel: t("edit.save"), onDone: saved };

  const changeTab = (value: string) => {
    const next = parseTab(value);
    setTab(next);
    // Bo'lim URL'da — havolani ulashish va sahifani yangilash uchun
    const path = getPathname({ href: `/admin/bizneslar/${id}`, locale });
    window.history.replaceState(null, "", `${path}?bolim=${next}`);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/bizneslar">
            <ArrowLeft aria-hidden="true" />
            {t("edit.back")}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{business.name}</h1>
          <BusinessStatusBadge status={business.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {business.category.name} · {business.district.name}
        </p>
        {!canEdit && (
          <Alert>
            <AlertDescription>{t("edit.readOnly")}</AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList aria-label={t("edit.sections")} className="w-max">
            {EDITOR_TABS.map((step) => (
              <TabsTrigger key={step} value={step} className="px-3">
                {t(`steps.${step}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="basic" className="pt-4">
          <BasicSection {...props} onDone={saved} />
        </TabsContent>
        <TabsContent value="location" className="pt-4">
          <LocationSection {...props} />
        </TabsContent>
        <TabsContent value="photos" className="pt-4">
          <PhotosSection {...props} />
        </TabsContent>
        <TabsContent value="hours" className="pt-4">
          <HoursSection {...props} />
        </TabsContent>
        <TabsContent value="contacts" className="pt-4">
          <ContactsSection {...props} />
        </TabsContent>
        <TabsContent value="catalog" className="pt-4">
          <CatalogSection {...props} />
        </TabsContent>
        <TabsContent value="status" className="pt-4">
          <StatusSection business={business} onDone={() => undefined} />
        </TabsContent>
        <TabsContent value="stats" className="pt-4">
          <StatsSection business={business} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
