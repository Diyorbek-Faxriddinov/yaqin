"use client";

import { Heart, LogIn, LogOut, MessageSquareWarning, Star, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { currentPathWithoutLocale, loginHref, useLogout, useMe } from "../use-me";

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

/**
 * Header'dagi kirish tugmasi yoki foydalanuvchi menyusi. Holat brauzerda olinadi —
 * sahifalar statik (keshlanadigan) bo'lib qoladi (ADR-0012).
 */
export function UserMenu() {
  const t = useTranslations("Auth");
  const tNav = useTranslations("Nav");
  const tProfile = useTranslations("Profile.nav");
  const router = useRouter();
  const { data: me, isPending } = useMe();
  const logout = useLogout();

  if (isPending) return <Skeleton className="hidden h-10 w-24 md:block" />;

  if (!me) {
    return (
      <Button asChild variant="outline" className="hidden md:inline-flex">
        <Link
          href="/kirish"
          onClick={(event) => {
            // Kirishdan keyin shu sahifaga qaytish uchun
            event.preventDefault();
            router.push(loginHref(currentPathWithoutLocale()));
          }}
        >
          <LogIn aria-hidden="true" />
          {tNav("login")}
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="hidden gap-2 px-2 md:inline-flex"
          aria-label={t("userMenu")}
        >
          <span
            aria-hidden="true"
            className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
          >
            {initials(me.displayName)}
          </span>
          <span className="max-w-32 truncate">{me.displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{me.displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profil">
            <User aria-hidden="true" />
            {tProfile("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profil/sevimlilar">
            <Heart aria-hidden="true" />
            {tProfile("favorites")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profil/sharhlar">
            <Star aria-hidden="true" />
            {tProfile("reviews")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profil/xabarlar">
            <MessageSquareWarning aria-hidden="true" />
            {tProfile("complaints")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={logout.isPending} onSelect={() => logout.mutate()}>
          <LogOut aria-hidden="true" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
