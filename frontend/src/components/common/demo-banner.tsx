import { Info } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Mock maʼlumotlar haqiqiy deb ko'rinmasligi uchun ogohlantirish.
 * Xavfsiz standart: faqat NEXT_PUBLIC_DEMO_MODE="false" bo'lsa yashiriladi.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export async function DemoBanner() {
  if (!isDemoMode) return null;
  const t = await getTranslations("Common");

  return (
    <div className="border-b border-warning/20 bg-warning-soft text-sm text-warning">
      <p className="mx-auto flex max-w-6xl items-start gap-2 px-4 py-2">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t("demoBanner")}
      </p>
    </div>
  );
}
