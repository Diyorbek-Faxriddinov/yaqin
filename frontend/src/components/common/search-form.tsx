import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Oddiy GET forma: JavaScript yuklanmasdan ham ishlaydi (/qidiruv?q=...).
 * Takliflar (autocomplete) 2.4-qadamda qo'shiladi.
 */
export async function SearchForm({
  className,
  defaultValue,
}: {
  className?: string;
  defaultValue?: string;
}) {
  const t = await getTranslations("Search");
  const locale = (await getLocale()) as AppLocale;

  return (
    <form
      role="search"
      action={getPathname({ href: "/qidiruv", locale })}
      className={cn("relative flex w-full items-center", className)}
    >
      <label htmlFor="site-search" className="sr-only">
        {t("label")}
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 size-4 text-muted-foreground"
      />
      <input
        id="site-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t("placeholder")}
        autoComplete="off"
        enterKeyHint="search"
        className="h-10 w-full rounded-lg border border-input bg-background pr-24 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      />
      <button
        type="submit"
        className="absolute right-1 inline-flex h-8 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {t("submit")}
      </button>
    </form>
  );
}
