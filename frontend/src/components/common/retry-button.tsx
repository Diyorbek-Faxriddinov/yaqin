"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

/** Server komponentini qayta so'raydi (sahifani to'liq qayta yuklamasdan) */
export function RetryButton({ onRetry }: { onRetry?: () => void }) {
  const t = useTranslations("States");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          onRetry?.();
          router.refresh();
        })
      }
    >
      <RefreshCw aria-hidden="true" className={pending ? "animate-spin" : undefined} />
      {t("retry")}
    </Button>
  );
}
