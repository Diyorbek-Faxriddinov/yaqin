import { LayoutGrid, LogIn, Map as MapIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { SearchForm } from "./search-form";

export async function SiteHeader() {
  const t = await getTranslations("Nav");

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/85">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link
          href="/"
          className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
        </Link>

        <SearchForm className="hidden max-w-xl md:flex" />

        {/* Planshetda (md) faqat ikonka, desktopda (lg) matn bilan; telefonda — pastki menyu */}
        <nav aria-label={t("main")} className="ml-auto hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" className="px-2.5 lg:px-4">
            <Link href="/kategoriyalar">
              <LayoutGrid aria-hidden="true" />
              <span className="sr-only lg:not-sr-only">{t("categories")}</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" className="px-2.5 lg:px-4">
            <Link href="/xarita">
              <MapIcon aria-hidden="true" />
              <span className="sr-only lg:not-sr-only">{t("map")}</span>
            </Link>
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <LanguageSwitcher />
          <Button asChild variant="outline" className="hidden md:inline-flex">
            <Link href="/kirish">
              <LogIn aria-hidden="true" />
              {t("login")}
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
