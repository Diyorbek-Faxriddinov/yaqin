"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { LOCATION_COOKIE, LOCATION_MAX_AGE_SECONDS, serializeLocation } from "@/lib/location";

function writeCookie(value: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCATION_COOKIE}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

export function clearLocation() {
  writeCookie("", 0);
}

/**
 * Brauzerdan joylashuvni so'raydi va (~110 m aniqlikda) cookie'ga yozadi.
 * Natija: true — joylashuv olindi; false — rad etildi yoki aniqlab bo'lmadi (xabar ko'rsatiladi).
 */
export function useGeolocation() {
  const t = useTranslations("Location");
  const [locating, setLocating] = useState(false);

  const request = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        if (!("geolocation" in navigator)) {
          toast.error(t("unavailable"));
          resolve(false);
          return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            writeCookie(
              serializeLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }),
              LOCATION_MAX_AGE_SECONDS,
            );
            setLocating(false);
            resolve(true);
          },
          (error) => {
            setLocating(false);
            toast.error(error.code === error.PERMISSION_DENIED ? t("denied") : t("unavailable"));
            resolve(false);
          },
          { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
        );
      }),
    [t],
  );

  return { request, locating };
}
