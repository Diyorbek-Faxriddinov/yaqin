import type { AdminBusiness } from "@/lib/api/types";

/**
 * Formalar ishlatadigan biznes maydonlari — admin (`AdminBusiness`) va biznes egasi kabineti
 * (`OwnerBusiness`) uchun umumiy. Rozilik faqat adminda bor (egaga ko'rsatilmaydi).
 */
export type EditableBusiness = Pick<
  AdminBusiness,
  | "id"
  | "name"
  | "description"
  | "category"
  | "district"
  | "address"
  | "location"
  | "phones"
  | "telegram"
  | "instagram"
  | "website"
  | "amenities"
  | "schedule"
  | "photos"
> & { consent?: AdminBusiness["consent"] };

/**
 * Biznes bo'limlari uch joyda ishlatiladi: tezkor qo'shish ustasi (qadam-baqadam), admin
 * tahrirlash sahifasi (tablar) va biznes egasi kabineti (taklif sifatida, owner-mode.ts).
 * Farq — tugma yozuvi va saqlangandan keyingi harakat.
 */
export type SectionProps = {
  business: EditableBusiness;
  canEdit: boolean;
  /** "Keyingi" (usta), "Saqlash" (tahrirlash) yoki "Tasdiqlashga yuborish" (egasi) */
  submitLabel: string;
  /** Muvaffaqiyatli saqlangandan keyin (usta — keyingi qadam, tahrirlash — xabar) */
  onDone: () => void;
};
