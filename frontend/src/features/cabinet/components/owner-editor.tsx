"use client";

import { useState } from "react";
import { ArrowLeft, Clock, ExternalLink, Info, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OwnerModeProvider } from "@/features/admin/owner-mode";
import { BasicSection } from "@/features/admin/components/sections/basic-section";
import { CatalogSection } from "@/features/admin/components/sections/catalog-section";
import { ContactsSection } from "@/features/admin/components/sections/contacts-section";
import { HoursSection } from "@/features/admin/components/sections/hours-section";
import { LocationSection } from "@/features/admin/components/sections/location-section";
import { PhotosSection } from "@/features/admin/components/sections/photos-section";
import { BusinessStatusBadge } from "@/features/admin/components/status-badge";
import { getPathname, Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { BrowserApiError } from "@/lib/api/browser";
import { CABINET_TABS, type CabinetTab, parseCabinetTab } from "../cabinet-params";
import { useLeaveBusiness, useOwnChanges, useOwnedBusiness } from "../use-cabinet";
import { OwnChanges } from "./own-changes";
import { OwnerStats } from "./owner-stats";

/**
 * /kabinet/[id] — admin paneldagi formalar, lekin "Saqlash" o'rniga "Tasdiqlashga yuborish":
 * o'zgarish moderator tasdiqlagandan keyin saytga chiqadi (OwnerModeProvider, ADR-0015).
 * Formalar joriy (tasdiqlangan) maʼlumotdan to'ldiriladi.
 */
export function OwnerEditor({ id, initialTab }: { id: string; initialTab: CabinetTab }) {
  const t = useTranslations("Cabinet");
  const tStates = useTranslations("States");
  const tProfile = useTranslations("Profile");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { data: business, isPending, isError, error } = useOwnedBusiness(id);
  const { data: changes } = useOwnChanges(id);
  const leave = useLeaveBusiness(id);
  const [tab, setTab] = useState<CabinetTab>(initialTab);

  if (isPending) return <Skeleton className="h-96" />;
  if (isError || !business) {
    const missing = error instanceof BrowserApiError && error.status === 404;
    return (
      <ErrorState
        title={missing ? t("notFound") : tStates("errorTitle")}
        description={missing ? undefined : tStates("errorDescription")}
        action={
          <Button asChild variant="outline">
            <Link href="/kabinet">{t("back")}</Link>
          </Button>
        }
      />
    );
  }

  const changeTab = (value: string) => {
    const next = parseCabinetTab(value);
    setTab(next);
    // Bo'lim URL'da — sahifani yangilaganda shu bo'lim ochiladi
    const path = getPathname({ href: `/kabinet/${id}`, locale });
    window.history.replaceState(null, "", `${path}?bolim=${next}`);
  };

  const submitted = () => toast.success(t("submitted"));
  const props = { business, canEdit: true, submitLabel: t("submit"), onDone: submitted };
  const pending = (changes ?? []).filter((change) => change.status === "pending").length;

  return (
    <OwnerModeProvider value>
      <div className="space-y-6">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/kabinet">
              <ArrowLeft aria-hidden="true" />
              {t("back")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{business.name}</h1>
            <BusinessStatusBadge status={business.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {business.category.name} · {business.district.name}
            {business.status === "published" && (
              <>
                {" · "}
                <Link
                  href={`/biznes/${business.slug}`}
                  className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                >
                  {t("viewPublic")}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </Link>
              </>
            )}
          </p>
          <Alert>
            <Info aria-hidden="true" />
            <AlertDescription>{t("moderationNote")}</AlertDescription>
          </Alert>
          {pending > 0 && tab !== "changes" && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <Clock aria-hidden="true" className="size-4 text-warning" />
              {t("pendingBanner", { count: pending })}
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => changeTab("changes")}
              >
                {t("pendingBannerLink")}
              </Button>
            </p>
          )}
        </div>

        <Tabs value={tab} onValueChange={changeTab}>
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <TabsList aria-label={t("title")} className="w-max">
              {CABINET_TABS.map((value) => (
                <TabsTrigger key={value} value={value} className="px-3">
                  {t(`tabs.${value}`)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* key — tasdiqlangan maʼlumot yangilansa, forma qaytadan to'ldiriladi */}
          <TabsContent value="basic" className="pt-4">
            <BasicSection key={business.updatedAt} {...props} />
          </TabsContent>
          <TabsContent value="location" className="pt-4">
            <LocationSection key={business.updatedAt} {...props} />
          </TabsContent>
          <TabsContent value="photos" className="pt-4">
            <PhotosSection key={business.updatedAt} {...props} />
          </TabsContent>
          <TabsContent value="hours" className="pt-4">
            <HoursSection key={business.updatedAt} {...props} />
          </TabsContent>
          <TabsContent value="contacts" className="pt-4">
            <ContactsSection key={business.updatedAt} {...props} />
          </TabsContent>
          <TabsContent value="catalog" className="pt-4">
            <CatalogSection {...props} />
          </TabsContent>
          <TabsContent value="changes" className="pt-4">
            <OwnChanges businessId={id} items={business.items} />
          </TabsContent>
          <TabsContent value="stats" className="pt-4">
            <OwnerStats businessId={id} />
          </TabsContent>
        </Tabs>

        <div className="border-t pt-4">
          <ConfirmDialog
            trigger={
              <Button variant="ghost" size="sm" className="-ml-2 text-destructive">
                <LogOut aria-hidden="true" />
                {t("leave.button")}
              </Button>
            }
            title={t("leave.confirm", { name: business.name })}
            description={t("leave.hint")}
            confirmLabel={t("leave.button")}
            cancelLabel={tProfile("cancel")}
            pending={leave.isPending}
            onConfirm={async () => {
              try {
                await leave.mutateAsync();
                toast.success(t("leave.done"));
                router.replace("/kabinet");
              } catch {
                toast.error(t("leave.error"));
              }
            }}
          />
        </div>
      </div>
    </OwnerModeProvider>
  );
}
