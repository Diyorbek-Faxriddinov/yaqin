import { getAllBusinessSlugs } from "@/features/business/queries";
import { atLeastOne } from "@/lib/static-params";

/**
 * Biznes sahifalari (profil, sharhlar, mahsulotlar) build vaqtida tayyorlanadi.
 * Layout darajasida — shu segmentdagi barcha ichki marshrutlarga tegishli bo'lishi uchun.
 */
export async function generateStaticParams() {
  return atLeastOne(
    (await getAllBusinessSlugs()).map((slug) => ({ slug })),
    "slug",
  );
}

export default function BusinessLayout({ children }: LayoutProps<"/[locale]/biznes/[slug]">) {
  return children;
}
