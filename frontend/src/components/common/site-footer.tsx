import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";

// cacheComponents rejimida new Date() keshlanmagan holda prerender'ni to'xtatadi
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

const LINKS = [
  { href: "/haqida", key: "about" },
  { href: "/biznes-qoshish", key: "addBusiness" },
  { href: "/shartlar", key: "terms" },
  { href: "/maxfiylik", key: "privacy" },
] as const;

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const tCommon = await getTranslations("Common");
  const year = await currentYear();

  return (
    <footer className="mt-16 border-t bg-muted/50">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-10 pb-[calc(2.5rem+var(--bottom-nav-height)+env(safe-area-inset-bottom))] md:grid-cols-[1fr_auto] md:pb-10">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{tCommon("tagline")}</p>
        </div>
        <nav aria-label={t("navLabel")}>
          <ul className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {LINKS.map(({ href, key }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-muted-foreground md:col-span-2">{t("copyright", { year })}</p>
      </div>
    </footer>
  );
}
