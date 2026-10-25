import { useTranslations } from "next-intl";
import { PublicShell } from "@/components/common/public-shell";
import { EmptyState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-3xl px-4 py-16">
        <EmptyState
          headingLevel="h1"
          title={t("title")}
          description={t("description")}
          action={
            <Button asChild>
              <Link href="/">{t("backHome")}</Link>
            </Button>
          }
        />
      </div>
    </PublicShell>
  );
}
