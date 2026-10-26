/**
 * Cache Components rejimida `generateStaticParams` kamida bitta natija qaytarishi shart, aks holda
 * build yiqiladi. Haqiqiy backend bilan bu odatiy holat: yangi bazada bizneslar yo'q, mahsuloti
 * yo'q biznes bor. Bo'sh bo'lsa — placeholder; sahifa uni API'dan topolmaydi va `notFound()` qiladi
 * (Next.js hujjatidagi tavsiya). Haqiqiy sahifalar birinchi so'rovda render qilinadi.
 */
export const PLACEHOLDER_PARAM = "__placeholder__";

export function atLeastOne<K extends string>(
  params: Array<Record<K, string>>,
  key: K,
): Array<Record<K, string>> {
  return params.length > 0 ? params : [{ [key]: PLACEHOLDER_PARAM } as Record<K, string>];
}
