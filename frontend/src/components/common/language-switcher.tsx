"use client";

import { Suspense } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localizedPath } from "@/i18n/localized-path";
import { usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

// Qisqa yorliqlar tugmada, to'liq nomi — ekran o'quvchilar uchun
const SHORT_LABEL: Record<AppLocale, string> = { uz: "UZ", ru: "RU" };

function Switcher({ pathname }: { pathname: string }) {
  const t = useTranslations("Language");
  const current = useLocale();

  return (
    <nav aria-label={t("label")} className="flex items-center rounded-lg bg-muted p-0.5">
      {routing.locales.map((locale) => {
        const active = locale === current;
        return (
          // Oddiy havola (Next Link emas): til almashganda sahifa to'liq yuklanadi. Next Link `/ru`
          // ni oldindan yuklab `/[locale]` qolipini o'rganardi va prefikssiz o'zbekcha manzillarni
          // (`/haqida`, `/xarita`) ham bosh sahifa deb taxmin qilib, prefetch'da 404 olardi
          <a
            key={locale}
            href={localizedPath(pathname, locale)}
            hrefLang={locale}
            lang={locale}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex h-8 min-w-10 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span aria-hidden="true">{SHORT_LABEL[locale]}</span>
            <span className="sr-only">{t(locale)}</span>
          </a>
        );
      })}
    </nav>
  );
}

function SwitcherWithPathname() {
  return <Switcher pathname={usePathname()} />;
}

/**
 * Joriy sahifani boshqa tilda ochadi. Oldindan render qilinmagan dinamik sahifalarda
 * usePathname to'xtab turadi (cacheComponents) — shunda vaqtincha bosh sahifaga havola beriladi.
 */
export function LanguageSwitcher() {
  return (
    <Suspense fallback={<Switcher pathname="/" />}>
      <SwitcherWithPathname />
    </Suspense>
  );
}
