"use client";

import { Suspense, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  FolderTree,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareWarning,
  Plus,
  ScrollText,
  Settings,
  Star,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { findActiveHref } from "@/components/common/active-href";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import type { AdminPermission } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useAdminLogout, useAdminMe, useCan } from "../use-admin";

type NavItem = {
  href: string;
  key:
    | "dashboard"
    | "businesses"
    | "requests"
    | "reviews"
    | "complaints"
    | "categories"
    | "users"
    | "stats"
    | "audit"
    | "staff"
    | "settings";
  icon: LucideIcon;
  permission?: AdminPermission;
};

const ITEMS: NavItem[] = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/bizneslar", key: "businesses", icon: Building2, permission: "business.view" },
  { href: "/admin/sorovlar", key: "requests", icon: Inbox, permission: "business.edit" },
  { href: "/admin/sharhlar", key: "reviews", icon: Star, permission: "review.moderate" },
  {
    href: "/admin/shikoyatlar",
    key: "complaints",
    icon: MessageSquareWarning,
    permission: "complaint.manage",
  },
  {
    href: "/admin/kategoriyalar",
    key: "categories",
    icon: FolderTree,
    permission: "category.manage",
  },
  { href: "/admin/foydalanuvchilar", key: "users", icon: Users, permission: "user.view" },
  { href: "/admin/statistika", key: "stats", icon: BarChart3, permission: "stats.view" },
  { href: "/admin/audit", key: "audit", icon: ScrollText, permission: "audit.view" },
  { href: "/admin/administratorlar", key: "staff", icon: UserCog, permission: "staff.manage" },
  { href: "/admin/sozlamalar", key: "settings", icon: Settings, permission: "settings.manage" },
];

function NavLinks({
  activeHref,
  onNavigate,
}: {
  activeHref: string | null;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Admin.nav");
  const { data: admin } = useAdminMe();
  const visible = ITEMS.filter(
    (item) => !item.permission || admin?.isRoot || admin?.permissions.includes(item.permission),
  );

  return (
    <ul className="space-y-1">
      {visible.map(({ href, key, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            onClick={onNavigate}
            aria-current={activeHref === href ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              activeHref === href
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {t(key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActiveNavLinks(props: { onNavigate?: () => void }) {
  const activeHref = findActiveHref(
    usePathname(),
    ITEMS.map((item) => item.href),
  );
  return <NavLinks activeHref={activeHref} {...props} />;
}

/** usePathname dinamik sahifalarda to'xtab turadi (cacheComponents) — Suspense bilan */
function Nav(props: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavLinks activeHref={null} {...props} />}>
      <ActiveNavLinks {...props} />
    </Suspense>
  );
}

function AccountBlock() {
  const t = useTranslations("Admin.nav");
  const { data: admin } = useAdminMe();
  const logout = useAdminLogout();
  return (
    <div className="space-y-2 border-t pt-4">
      {admin && <p className="truncate px-3 text-sm font-medium">{admin.displayName}</p>}
      <Button variant="ghost" className="w-full justify-start" onClick={() => logout.mutate()}>
        <LogOut aria-hidden="true" />
        {t("logout")}
      </Button>
      <Button asChild variant="ghost" className="w-full justify-start">
        <Link href="/">
          <ArrowLeft aria-hidden="true" />
          {t("backToSite")}
        </Link>
      </Button>
    </div>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("Admin.nav");
  const [menuOpen, setMenuOpen] = useState(false);
  const canEdit = useCan("business.edit");

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop: chap panel */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <Link
          href="/admin"
          className="rounded-lg px-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Logo />
        </Link>
        <nav aria-label={t("label")} className="flex-1">
          <Nav />
        </nav>
        <AccountBlock />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Telefon va planshet: yuqori panel */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur lg:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("menu")}>
                <Menu aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col gap-6 p-4">
              <SheetHeader className="p-0">
                <SheetTitle>
                  <Logo />
                </SheetTitle>
                <SheetDescription className="sr-only">{t("label")}</SheetDescription>
              </SheetHeader>
              <nav aria-label={t("label")} className="flex-1">
                <Nav onNavigate={() => setMenuOpen(false)} />
              </nav>
              <AccountBlock />
            </SheetContent>
          </Sheet>
          <Link
            href="/admin"
            className="rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Logo />
          </Link>
        </header>

        <main id="main" className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">
          {children}
        </main>
      </div>

      {canEdit && (
        <Suspense fallback={null}>
          <NewBusinessFab />
        </Suspense>
      )}
    </div>
  );
}

/** Tugma ko'rinadigan sahifalar — forma sahifalarida u formaning o'z tugmalarini to'sardi */
const FAB_PAGES = new Set(["/admin", "/admin/bizneslar"]);

/** Telefonda qo'l ostida: yangi biznes qo'shish */
function NewBusinessFab() {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();
  if (!FAB_PAGES.has(pathname)) return null;
  return (
    <Button
      asChild
      size="lg"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-full shadow-lg lg:hidden"
    >
      <Link href="/admin/bizneslar/yangi">
        <Plus aria-hidden="true" />
        {t("newBusiness")}
      </Link>
    </Button>
  );
}
