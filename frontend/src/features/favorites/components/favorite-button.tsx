"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentPathWithoutLocale, loginHref, useMe } from "@/features/auth/use-me";
import { useRouter } from "@/i18n/navigation";
import { BrowserApiError } from "@/lib/api/browser";
import { cn } from "@/lib/utils";
import { useFavoriteIds, useToggleFavorite } from "../use-favorites";

type Props = {
  businessId: string;
  businessName: string;
  /** icon — kartadagi dumaloq tugma; button — profildagi matnli tugma */
  variant?: "icon" | "button";
  className?: string;
};

export function FavoriteButton({ businessId, businessName, variant = "icon", className }: Props) {
  const t = useTranslations("Favorites");
  const router = useRouter();
  const { data: me } = useMe();
  const { data: ids } = useFavoriteIds();
  const toggle = useToggleFavorite();
  const active = ids?.has(businessId) ?? false;
  const label = active ? t("remove", { name: businessName }) : t("add", { name: businessName });

  const onClick = () => {
    if (!me) {
      router.push(loginHref(currentPathWithoutLocale()));
      return;
    }
    toggle.mutate(
      { businessId, add: !active },
      {
        onSuccess: () => toast.success(active ? t("removed") : t("added")),
        onError: (error) => {
          if (error instanceof BrowserApiError && error.status === 401) {
            router.push(loginHref(currentPathWithoutLocale()));
          } else {
            toast.error(t("error"));
          }
        },
      },
    );
  };

  const icon = (
    <Heart
      aria-hidden="true"
      className={cn("size-5 transition-colors", active && "fill-destructive text-destructive")}
    />
  );

  if (variant === "button") {
    return (
      <Button
        type="button"
        size="lg"
        variant="outline"
        // Ko'rinadigan matn nomning o'zi (WCAG 2.5.3); holat — aria-pressed
        aria-pressed={active}
        onClick={onClick}
        className={className}
      >
        {icon}
        {active ? t("saved") : t("save")}
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        // Stretched link ustida turishi uchun z-10
        "relative z-10 inline-flex size-10 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      {icon}
    </button>
  );
}
