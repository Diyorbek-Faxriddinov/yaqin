import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { LEGAL } from "@/content/legal";
import { LegalPage } from "@/features/static/components/legal-page";
import type { AppLocale } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await getLocale()) as AppLocale;
  const { title, description } = LEGAL.privacy[locale];
  return pageMetadata({ path: "/maxfiylik", locale, title, description });
}

export default function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}
