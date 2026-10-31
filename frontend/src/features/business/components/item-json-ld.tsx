import type { BusinessDetail, Item } from "@/lib/api/types";

/**
 * schema.org Product (mahsulot) yoki Service (xizmat) — narx, mavjudlik va rasm bilan; sotuvchi —
 * biznes (LocalBusiness). "So'rov bo'yicha" narxda taklif (offers) berilmaydi.
 * "<" belgisi qochiriladi: matn ichidagi "</script>" sahifani buzmasligi (XSS) uchun.
 */
export function ItemJsonLd({
  item,
  business,
  url,
  siteUrl,
}: {
  item: Item;
  business: BusinessDetail;
  url: string;
  siteUrl: string;
}) {
  const price = item.price;
  const toSom = (amount: number) => amount / 100;
  const offers =
    price.type === "on_request" || !price.min
      ? undefined
      : {
          "@type": "Offer",
          url,
          priceCurrency: "UZS",
          ...(price.type === "range" && price.max
            ? {
                priceSpecification: {
                  "@type": "PriceSpecification",
                  priceCurrency: "UZS",
                  minPrice: toSom(price.min.amount),
                  maxPrice: toSom(price.max.amount),
                },
              }
            : { price: toSom(price.min.amount) }),
          availability: item.isAvailable
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        };
  const seller = { "@type": "LocalBusiness", name: business.name };
  const data = {
    "@context": "https://schema.org",
    "@type": item.kind === "product" ? "Product" : "Service",
    name: item.name,
    url,
    description: item.description ?? undefined,
    // Rasm yo'llari saytga nisbatan — qidiruv tizimlari uchun to'liq manzil
    image: item.images.length
      ? item.images.map((image) => new URL(image.url, siteUrl).toString())
      : undefined,
    ...(item.kind === "product"
      ? { offers: offers && { ...offers, seller } }
      : { provider: seller, offers }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
