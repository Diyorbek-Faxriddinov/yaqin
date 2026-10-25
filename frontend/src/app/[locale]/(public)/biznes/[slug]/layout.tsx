import { getAllBusinessSlugs } from "@/features/business/queries";

/**
 * Biznes sahifalari (profil, sharhlar, mahsulotlar) build vaqtida tayyorlanadi.
 * Layout darajasida — shu segmentdagi barcha ichki marshrutlarga tegishli bo'lishi uchun.
 */
export async function generateStaticParams() {
  return (await getAllBusinessSlugs()).map((slug) => ({ slug }));
}

export default function BusinessLayout({ children }: LayoutProps<"/[locale]/biznes/[slug]">) {
  return children;
}
