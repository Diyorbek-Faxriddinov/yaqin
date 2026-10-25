import type { Metadata } from "next";
import { ArrowRight, Check, MapPin, Phone, Search, type LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  const locale = (await getLocale()) as AppLocale;
  return pageMetadata({ path: "/haqida", locale, title: t("title"), description: t("lead") });
}

const STEPS: Array<{ key: "find" | "compare" | "contact"; icon: LucideIcon }> = [
  { key: "find", icon: Search },
  { key: "compare", icon: MapPin },
  { key: "contact", icon: Phone },
];

export default async function AboutPage() {
  const t = await getTranslations("About");
  const tNav = await getTranslations("Nav");

  return (
    <div className="mx-auto max-w-3xl space-y-12 px-4 py-8">
      <div className="space-y-3">
        <Breadcrumbs items={[{ label: tNav("home"), href: "/" }, { label: t("title") }]} />
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("lead")}</p>
      </div>

      <section aria-labelledby="about-how" className="space-y-4">
        <h2 id="about-how" className="text-xl font-semibold">
          {t("how.title")}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ key, icon: Icon }) => (
            <li key={key} className="space-y-2 rounded-xl border p-4">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="font-medium">{t(`how.${key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`how.${key}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="about-business"
        className="space-y-4 rounded-2xl bg-primary-soft p-6"
      >
        <h2 id="about-business" className="text-xl font-semibold">
          {t("business.title")}
        </h2>
        <p>{t("business.text")}</p>
        <ul className="space-y-2">
          {(["free", "visit", "consent", "report"] as const).map((key) => (
            <li key={key} className="flex gap-2">
              <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              {t(`business.points.${key}`)}
            </li>
          ))}
        </ul>
        <Button asChild size="lg">
          <Link href="/biznes-qoshish">
            {t("business.cta")}
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>

      <section aria-labelledby="about-principles" className="space-y-4">
        <h2 id="about-principles" className="text-xl font-semibold">
          {t("principles.title")}
        </h2>
        <ul className="space-y-3">
          {(["honest", "privacy", "local", "fix"] as const).map((key) => (
            <li key={key} className="rounded-xl border p-4">
              <h3 className="font-medium">{t(`principles.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`principles.${key}.text`)}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          {t.rich("more", {
            privacy: (chunks) => (
              <Link href="/maxfiylik" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
            contact: (chunks) => (
              <Link href="/aloqa" className="underline underline-offset-4">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </section>
    </div>
  );
}
