"use client";

import { useTransition } from "react";
import { Loader2, LocateFixed, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { clearLocation, useGeolocation } from "../use-geolocation";

/**
 * "Yaqin atrofimda": joylashuvni so'raydi va masofa bo'yicha saralangan sahifaga o'tadi.
 * `href` — o'tiladigan manzil (masalan /qidiruv?saralash=yaqin).
 */
export function NearbyButton({
  href,
  size = "default",
  variant = "outline",
  className,
}: {
  href: string;
  size?: "default" | "lg";
  variant?: "outline" | "default" | "secondary";
  className?: string;
}) {
  const t = useTranslations("Location");
  const router = useRouter();
  const { request, locating } = useGeolocation();
  const [navigating, startTransition] = useTransition();
  const busy = locating || navigating;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      disabled={busy}
      className={className}
      onClick={async () => {
        if (await request()) {
          startTransition(() => {
            router.push(href);
            router.refresh();
          });
        }
      }}
    >
      {busy ? (
        <Loader2 aria-hidden="true" className="animate-spin" />
      ) : (
        <LocateFixed aria-hidden="true" />
      )}
      {locating ? t("locating") : t("nearMe")}
    </Button>
  );
}

/** Joylashuv yoqilganini ko'rsatadi va uni o'chirish imkonini beradi */
export function LocationChip({ resetHref, className }: { resetHref: string; className?: string }) {
  const t = useTranslations("Location");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <span
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary-soft pr-1 pl-3 text-sm font-medium text-primary-soft-foreground",
        className,
      )}
    >
      <LocateFixed aria-hidden="true" className="size-4" />
      {t("active")}
      <button
        type="button"
        disabled={pending}
        aria-label={t("clear")}
        title={t("clear")}
        onClick={() => {
          clearLocation();
          startTransition(() => {
            router.push(resetHref);
            router.refresh();
          });
        }}
        className="inline-flex size-8 items-center justify-center rounded-md hover:bg-primary/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </span>
  );
}
