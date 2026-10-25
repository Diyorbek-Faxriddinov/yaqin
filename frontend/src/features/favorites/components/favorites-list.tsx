"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { RetryButton } from "@/components/common/retry-button";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { BusinessGrid, BusinessGridSkeleton } from "@/features/business/components/business-card";
import { Link } from "@/i18n/navigation";
import { useFavoritesList } from "../use-favorites";

export function FavoritesList() {
  const t = useTranslations("Favorites");
  const tStates = useTranslations("States");
  const { data, isPending, isError, refetch } = useFavoritesList();

  if (isPending) return <BusinessGridSkeleton count={3} />;
  if (isError) {
    return (
      <ErrorState
        title={tStates("errorTitle")}
        description={tStates("errorDescription")}
        action={<RetryButton onRetry={() => void refetch()} />}
      />
    );
  }
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={
          <Button asChild>
            <Link href="/kategoriyalar">{t("browse")}</Link>
          </Button>
        }
      />
    );
  }
  return (
    <>
      {/* Kartalar sarlavhasi h3 — sarlavhalar tartibi uzilmasligi uchun (a11y) */}
      <h2 className="sr-only">{t("listHeading")}</h2>
      <BusinessGrid businesses={data} />
    </>
  );
}
