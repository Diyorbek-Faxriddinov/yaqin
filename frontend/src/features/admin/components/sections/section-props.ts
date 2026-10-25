import type { AdminBusiness } from "@/lib/api/types";

/**
 * Biznes bo'limlari ikki joyda ishlatiladi: tezkor qo'shish ustasi (qadam-baqadam) va
 * tahrirlash sahifasi (tablar). Farq — tugma yozuvi va saqlangandan keyingi harakat.
 */
export type SectionProps = {
  business: AdminBusiness;
  canEdit: boolean;
  /** "Keyingi" (usta) yoki "Saqlash" (tahrirlash) */
  submitLabel: string;
  /** Muvaffaqiyatli saqlangandan keyin (usta — keyingi qadam, tahrirlash — xabar) */
  onDone: () => void;
};
