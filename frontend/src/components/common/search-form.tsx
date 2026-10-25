import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const SIZES = {
  default: {
    input: "h-10 pr-24 pl-9 text-base md:text-sm",
    icon: "left-3 size-4",
    button: "right-1 h-8 px-3 text-sm",
  },
  lg: {
    input: "h-14 pr-32 pl-12 text-base shadow-sm",
    icon: "left-4 size-5",
    button: "right-2 h-10 px-5 text-base",
  },
} as const;

/**
 * Oddiy GET forma: JavaScript yuklanmasdan ham ishlaydi (/qidiruv?q=...).
 * Bir sahifada bir nechta forma bo'lishi mumkin — har biriga alohida `id`.
 */
export async function SearchForm({
  id = "site-search",
  size = "default",
  defaultValue,
  className,
}: {
  id?: string;
  size?: keyof typeof SIZES;
  defaultValue?: string;
  className?: string;
}) {
  const t = await getTranslations("Search");
  const locale = (await getLocale()) as AppLocale;
  const styles = SIZES[size];

  return (
    <form
      role="search"
      action={getPathname({ href: "/qidiruv", locale })}
      className={cn("relative flex w-full items-center", className)}
    >
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <Search
        aria-hidden="true"
        className={cn("pointer-events-none absolute text-muted-foreground", styles.icon)}
      />
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t("placeholder")}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        className={cn(
          "w-full rounded-lg border border-input bg-background outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          styles.input,
        )}
      />
      <button
        type="submit"
        className={cn(
          "absolute inline-flex items-center rounded-md bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          styles.button,
        )}
      >
        {t("submit")}
      </button>
    </form>
  );
}
