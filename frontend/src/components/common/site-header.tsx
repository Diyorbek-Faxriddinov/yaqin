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

        <nav aria-label={t("main")} className="ml-auto hidden items-center gap-1 lg:flex">
          <Button asChild variant="ghost">
            <Link href="/kategoriyalar">
              <LayoutGrid aria-hidden="true" />
              {t("categories")}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/xarita">
              <MapIcon aria-hidden="true" />
              {t("map")}
            </Link>
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
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
