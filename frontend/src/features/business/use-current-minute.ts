"use client";

import { useSyncExternalStore } from "react";

// Joriy daqiqa: sahifa keshlangan bo'lsa ham vaqtga bog'liq ko'rinishlar foydalanuvchi vaqti
// bo'yicha yangilanadi. Serverda null — hydration farqi bo'lmasligi uchun faqat brauzerda.
const subscribe = (onChange: () => void) => {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
};
const getMinute = () => Math.floor(Date.now() / 60_000);
const getServerMinute = () => null;

/** Daqiqa boshidagi Date (brauzerda) yoki null (serverda va hydration paytida) */
export function useCurrentMinute(): Date | null {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  return minute === null ? null : new Date(minute * 60_000);
}
