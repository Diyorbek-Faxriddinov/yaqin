import type { Amenity } from "@/lib/api/types";

/** Kontraktdagi `Amenity` tartibi — ko'rsatish tartibi (backend `Business.Amenity` bilan bir xil) */
export const AMENITIES: readonly Amenity[] = [
  "card_payment",
  "mobile_payment",
  "delivery",
  "takeaway",
  "parking",
  "wifi",
  "air_conditioning",
  "family_room",
  "kids_area",
  "prayer_room",
  "wheelchair_access",
  "appointment",
  "women_section",
];

/** Tanlanganlar — kontrakt tartibida, takrorsiz */
export function sortAmenities(selected: Iterable<string>): Amenity[] {
  const set = new Set(selected);
  return AMENITIES.filter((amenity) => set.has(amenity));
}
