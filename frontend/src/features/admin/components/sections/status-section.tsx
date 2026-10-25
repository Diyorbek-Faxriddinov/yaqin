"use client";

import { CheckCircle2, Circle, ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { BusinessStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useCan } from "../../use-admin";
import { useAdminItems, useUpdateBusiness } from "../../use-admin-business";
import { BusinessStatusBadge } from "../status-badge";
import type { SectionProps } from "./section-props";

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 text-sm",
        done ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {done ? (
        <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
      ) : (
        <Circle aria-hidden="true" className="size-4" />
      )}
      <span>{label}</span>
      {/* Holat faqat ikonkada emas — ekran o'quvchilar uchun ham (WCAG 1.4.1) */}
      <span className="sr-only">{done ? "✓" : "✗"}</span>
    </li>
  );
}

/** E'lon qilish: majburiy va tavsiya etilgan maydonlar ro'yxati, holatni o'zgartirish */
export function StatusSection({ business, onDone }: Omit<SectionProps, "submitLabel" | "canEdit">) {
  const t = useTranslations("Admin.publish");
  const canPublish = useCan("business.publish");
  const update = useUpdateBusiness(business.id);
  const { data: items } = useAdminItems(business.id);

  const required = {
    location: business.location !== null,
    address: business.address.text.trim().length > 0,
    consent: business.consent !== null,
  };
  const recommended = {
    photos: business.photos.length > 0,
    hours: business.schedule !== null,
    phones: business.phones.length > 0,
    items: (items?.length ?? 0) > 0,
  };
  const ready = Object.values(required).every(Boolean);

  const setStatus = (status: BusinessStatus) =>
    update.mutate(
      { status },
      {
        onSuccess: () => {
          toast.success(
            status === "published"
              ? t("published")
              : status === "hidden"
                ? t("hidden")
                : t("drafted"),
          );
          onDone();
        },
        onError: () => toast.error(t("cannotPublish")),
      },
    );

  return (
    <div className="space-y-6">
      <p className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("current")}:</span>
        <BusinessStatusBadge status={business.status} />
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("requirements")}</h3>
          <ul className="space-y-1.5">
            {(Object.keys(required) as Array<keyof typeof required>).map((key) => (
              <Check key={key} done={required[key]} label={t(`required.${key}`)} />
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("recommended")}</h3>
          <ul className="space-y-1.5">
            {(Object.keys(recommended) as Array<keyof typeof recommended>).map((key) => (
              <Check key={key} done={recommended[key]} label={t(`recommendedItems.${key}`)} />
            ))}
          </ul>
        </div>
      </div>

      {canPublish && (
        <div className="flex flex-wrap gap-2">
          {business.status !== "published" && (
            <Button
              size="lg"
              onClick={() => setStatus("published")}
              disabled={!ready || update.isPending}
            >
              {update.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {t("publish")}
            </Button>
          )}
          {business.status === "published" && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setStatus("hidden")}
              disabled={update.isPending}
            >
              {t("hide")}
            </Button>
          )}
          {business.status !== "draft" && (
            <Button
              size="lg"
              variant="ghost"
              onClick={() => setStatus("draft")}
              disabled={update.isPending}
            >
              {t("toDraft")}
            </Button>
          )}
        </div>
      )}
      {!ready && business.status !== "published" && (
        <p className="text-sm text-muted-foreground">{t("cannotPublish")}</p>
      )}

      {business.status === "published" && (
        <Button asChild variant="link" className="px-0">
          <Link href={`/biznes/${business.slug}`} target="_blank" rel="noopener">
            {t("viewOnSite")}
            <ExternalLink aria-hidden="true" />
          </Link>
        </Button>
      )}
    </div>
  );
}
