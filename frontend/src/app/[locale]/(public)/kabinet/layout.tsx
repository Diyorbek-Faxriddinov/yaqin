import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Cabinet");
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * Biznes egasi kabineti (ADR-0015). Ommaviy layout admin va kabinet matnlarini yubormaydi —
 * kabinet admin formalarini ishlatadi, shuning uchun bu yerda barcha tarjimalar bilan provider.
 */
export default async function CabinetLayout({ children }: LayoutProps<"/[locale]/kabinet">) {
  return (
    <NextIntlClientProvider messages={await getMessages()}>
      <div className="mx-auto w-full max-w-3xl px-4 py-8">{children}</div>
    </NextIntlClientProvider>
  );
}
