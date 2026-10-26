import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.meta");
  // Admin panel qidiruv tizimlariga butunlay yopiq
  return {
    title: { default: t("title"), template: `%s — ${t("title")}` },
    robots: { index: false, follow: false },
  };
}

// Ommaviy layout admin matnlarini yubormaydi — admin bo'limida barcha tarjimalar bilan provider
export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return <NextIntlClientProvider messages={await getMessages()}>{children}</NextIntlClientProvider>;
}
