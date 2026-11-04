"use client";

import { createContext, useContext } from "react";

/**
 * Biznes bo'limlari (formalar) ikki joyda ishlaydi:
 * - admin panel — o'zgarish darhol saqlanadi;
 * - biznes egasi kabineti (`/kabinet`, ADR-0015) — o'zgarish taklif sifatida yuboriladi va
 *   moderator tasdiqlagandan keyin saytga chiqadi. Rozilik va holat bo'limlari egaga ko'rinmaydi.
 *
 * Saqlash hook'lari (use-admin-business.ts) shu kontekstga qarab qaysi API'ga yuborishni tanlaydi —
 * formalarning o'zi ikkala rejimda bir xil.
 */
const OwnerModeContext = createContext(false);

export const OwnerModeProvider = OwnerModeContext.Provider;

export function useOwnerMode(): boolean {
  return useContext(OwnerModeContext);
}
