import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Oddiy havolali sahifalash: JavaScript'siz ishlaydi va qidiruv tizimlari barcha
 * sahifalarni topa oladi.
 */
export async function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const t = await getTranslations("Results");

  return (
    <nav aria-label={t("pagination")} className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link href={hrefForPage(page - 1)} rel="prev">
            <ChevronLeft aria-hidden="true" />
            {t("prev")}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground tabular-nums">
        {t("pageOf", { page, total: totalPages })}
      </span>
      {page < totalPages ? (
        <Button asChild variant="outline">
          <Link href={hrefForPage(page + 1)} rel="next">
            {t("next")}
            <ChevronRight aria-hidden="true" />
          </Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
