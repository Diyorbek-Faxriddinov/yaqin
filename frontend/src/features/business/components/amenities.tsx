import {
  Accessibility,
  AirVent,
  Baby,
  CalendarCheck,
  CircleParking,
  CreditCard,
  MoonStar,
  ShoppingBag,
  Smartphone,
  Truck,
  UserRound,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Amenity } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export const AMENITY_ICONS: Record<Amenity, LucideIcon> = {
  card_payment: CreditCard,
  mobile_payment: Smartphone,
  delivery: Truck,
  takeaway: ShoppingBag,
  parking: CircleParking,
  wifi: Wifi,
  air_conditioning: AirVent,
  family_room: Users,
  kids_area: Baby,
  prayer_room: MoonStar,
  wheelchair_access: Accessibility,
  appointment: CalendarCheck,
  women_section: UserRound,
};

/** Biznes qulayliklari — ikonka va nomi bilan (API tartibida) */
export function AmenityList({
  amenities,
  className,
}: {
  amenities: Amenity[];
  className?: string;
}) {
  const t = useTranslations("Amenities");
  if (amenities.length === 0) return null;
  return (
    <ul aria-label={t("title")} className={cn("flex flex-wrap gap-2", className)}>
      {amenities.map((amenity) => {
        const Icon = AMENITY_ICONS[amenity];
        return (
          <li
            key={amenity}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-sm"
          >
            <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
            {t(amenity)}
          </li>
        );
      })}
    </ul>
  );
}
