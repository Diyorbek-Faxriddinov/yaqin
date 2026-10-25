import type { BusinessDetail } from "@/lib/api/types";

/**
 * schema.org LocalBusiness — qidiruv tizimlarida manzil, reyting va telefon bilan boy natija.
 * "<" belgisi qochiriladi: matn ichidagi "</script>" sahifani buzmasligi (XSS) uchun.
 */
export function BusinessJsonLd({ business, url }: { business: BusinessDetail; url: string }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url,
    description: business.description ?? undefined,
    telephone: business.phones[0]?.number,
    address: {
      "@type": "PostalAddress",
      streetAddress: business.address.text,
      addressLocality: "Toshkent",
      addressCountry: "UZ",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: business.location.lat,
      longitude: business.location.lng,
    },
    aggregateRating:
      business.rating.average != null && business.rating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: business.rating.average,
            reviewCount: business.rating.count,
          }
        : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
