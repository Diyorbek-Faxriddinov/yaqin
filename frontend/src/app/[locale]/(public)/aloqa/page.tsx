import type { Metadata } from "next";
import { Mail, MessageSquareWarning, Phone, Send, Store, type LucideIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatPhone, telHref } from "@/lib/format/phone";
import { pageMetadata } from "@/lib/seo";
import { getPublicSettings } from "@/features/settings/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contact");
  const locale = (await getLocale()) as AppLocale;
  return pageMetadata({ path: "/aloqa", locale, title: t("title"), description: t("lead") });
}

export default async function ContactPage() {
  const t = await getTranslations("Contact");
  const tNav = await getTranslations("Nav");
  const { contacts, businessRequestsOpen } = await getPublicSettings();

  // Kontaktlar admin "Sozlamalar" sahifasida kiritiladi; bo'shlari ko'rsatilmaydi
  const channels: Array<{ key: string; icon: LucideIcon; label: string; href: string }> = [
    contacts.telegram && {
      key: "telegram",
      icon: Send,
      label: `@${contacts.telegram}`,
      href: `https://t.me/${contacts.telegram}`,
    },
    contacts.phone && {
      key: "phone",
      icon: Phone,
      label: formatPhone(contacts.phone),
      href: telHref(contacts.phone),
    },
    contacts.email && {
      key: "email",
      icon: Mail,
      label: contacts.email,
      href: `mailto:${contacts.email}`,
    },
  ].filter((channel) => Boolean(channel)) as Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    href: string;
  }>;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8">
      <div className="space-y-3">
        <Breadcrumbs items={[{ label: tNav("home"), href: "/" }, { label: t("title") }]} />
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("lead")}</p>
      </div>

      <section aria-labelledby="contact-channels" className="space-y-3">
        <h2 id="contact-channels" className="text-xl font-semibold">
          {t("channels")}
        </h2>
        {channels.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-3">
            {channels.map(({ key, icon: Icon, label, href }) => (
              <li key={key}>
                <a
                  href={href}
                  {...(key === "telegram" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block text-sm text-muted-foreground">
                      {t(`labels.${key}`)}
                    </span>
                    <span className="block truncate font-medium">{label}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed p-4 text-muted-foreground">
            {t("noChannels")}
          </p>
        )}
      </section>

      <section aria-labelledby="contact-topics" className="space-y-3">
        <h2 id="contact-topics" className="text-xl font-semibold">
          {t("topics")}
        </h2>
        <ul className="space-y-3">
          {businessRequestsOpen && (
            <li className="flex gap-3 rounded-xl border p-4">
              <Store aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <h3 className="font-medium">{t("addBusiness.title")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t.rich("addBusiness.text", {
                    link: (chunks) => (
                      <Link href="/biznes-qoshish" className="underline underline-offset-4">
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </div>
            </li>
          )}
          <li className="flex gap-3 rounded-xl border p-4">
            <MessageSquareWarning
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-primary"
            />
            <div>
              <h3 className="font-medium">{t("wrongInfo.title")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("wrongInfo.text")}</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  );
}
