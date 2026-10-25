import { createElement } from "react";
import {
  BedDouble,
  Briefcase,
  Car,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  PartyPopper,
  PawPrint,
  Scissors,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CategoryIconKey as ApiCategoryIconKey } from "@/lib/api/types";

/**
 * Kategoriya ikonkasi API'dan kalit (iconKey) sifatida keladi, admin uni ro'yxatdan tanlaydi.
 * Nomaʼlum kalit uchun umumiy "doʻkon" ikonkasi.
 */
export const CATEGORY_ICONS = {
  shopping: ShoppingBag,
  food: UtensilsCrossed,
  beauty: Scissors,
  "home-services": Wrench,
  auto: Car,
  health: HeartPulse,
  education: GraduationCap,
  sport: Dumbbell,
  travel: BedDouble,
  events: PartyPopper,
  pets: PawPrint,
  professional: Briefcase,
} satisfies Record<ApiCategoryIconKey, LucideIcon>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;

export function getCategoryIcon(key: string | null | undefined): LucideIcon {
  return (key && CATEGORY_ICONS[key as CategoryIconKey]) || Store;
}

export function CategoryIcon({
  iconKey,
  className,
}: {
  iconKey: string | null | undefined;
  className?: string;
}) {
  // Ikonka statik ro'yxatdan olinadi, render paytida yangi komponent yaratilmaydi
  return createElement(getCategoryIcon(iconKey), { "aria-hidden": true, className });
}
