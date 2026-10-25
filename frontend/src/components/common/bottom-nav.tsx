"use client";

import { Suspense } from "react";
import { Heart, House, Map as MapIcon, Search, User, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { findActiveHref } from "./active-href";

type NavItem = {
  href: string;
  labelKey: "home" | "search" | "map" | "favorites" | "profile";
  icon: LucideIcon;
};

const ITEMS: NavItem[] = [
  { href: "/", labelKey: "home", icon: House },
  { href: "/qidiruv", labelKey: "search", icon: Search },
  { href: "/xarita", labelKey: "map", icon: MapIcon },
  { href: "/profil/sevimlilar", labelKey: "favorites", icon: Heart },
  { href: "/profil", labelKey: "profile", icon: User },
];

function BottomNavView({ activeHref }: { activeHref: string | null }) {
  const t = useTranslations("Nav");

  return (
    <nav
      aria-label={t("main")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/85 md:hidden"
    >
      <ul className="mx-auto grid h-(--bottom-nav-height) max-w-md grid-cols-5">
        {ITEMS.map(({ href, labelKey, icon: Icon }) => {
          const active = href === activeHref;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors focus-visible:bg-accent focus-visible:outline-none",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden="true" className="size-5" strokeWidth={active ? 2.4 : 2} />
                {t(labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function BottomNavWithPathname() {
  const pathname = usePathname();
  return (
    <BottomNavView
      activeHref={findActiveHref(
        pathname,
        ITEMS.map((item) => item.href),
      )}
    />
  );
}

/** Faqat telefonda (md dan kichik) ko'rinadigan pastki navigatsiya */
export function BottomNav() {
  return (
    <Suspense fallback={<BottomNavView activeHref={null} />}>
      <BottomNavWithPathname />
    </Suspense>
  );
}
