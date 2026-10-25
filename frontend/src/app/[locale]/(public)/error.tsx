"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";

/** Kutilmagan xato: foydalanuvchiga tushunarli xabar, texnik tafsilotlar ko'rsatilmaydi */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("States");

  useEffect(() => {
    // Monitoring (Sentry) 5-bosqichda ulanadi; hozircha faqat brauzer konsoliga
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <ErrorState
        headingLevel="h1"
        title={t("errorTitle")}
        description={t("errorDescription")}
        action={
          <Button variant="outline" onClick={reset}>
            <RefreshCw aria-hidden="true" />
            {t("retry")}
          </Button>
        }
      />
    </div>
  );
}
