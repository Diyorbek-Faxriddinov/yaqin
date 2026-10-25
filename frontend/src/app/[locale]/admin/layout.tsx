import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Admin.meta");
  // Admin panel qidiruv tizimlariga butunlay yopiq
  return {
    title: { default: t("title"), template: `%s — ${t("title")}` },
    robots: { index: false, follow: false },
  };
}

export default function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  return children;
}
