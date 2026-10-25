"use client";

import { useTranslations } from "next-intl";
import { findActiveHref } from "@/components/common/active-href";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/profil", key: "profile" },
  { href: "/profil/sevimlilar", key: "favorites" },
  { href: "/profil/sharhlar", key: "reviews" },
  { href: "/profil/xabarlar", key: "complaints" },
] as const;

export function ProfileNav() {
  const t = useTranslations("Profile");
  const active = findActiveHref(
    usePathname(),
    ITEMS.map((item) => item.href),
  );

  return (
    <nav aria-label={t("title")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1 border-b">
        {ITEMS.map(({ href, key }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                active === href
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`nav.${key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
