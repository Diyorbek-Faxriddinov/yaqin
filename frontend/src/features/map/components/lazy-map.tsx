"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MapViewProps } from "./map-view";

/**
 * MapLibre (~250 KB gzip) faqat xarita kerak bo'lgan sahifada va faqat brauzerda yuklanadi.
 */
export const MapView = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});

/** Admin: joylashuv tanlash xaritasi (faqat brauzerda) */
export const LocationPicker = dynamic(
  () => import("./location-picker").then((m) => m.LocationPicker),
  { ssr: false, loading: () => <Skeleton className="h-72 rounded-xl" /> },
);

/** Xarita ekranga yaqinlashgandagina yuklanadi (biznes profilidagi kichik xarita uchun) */
export function MapWhenVisible({ className, ...props }: MapViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      {visible ? (
        <MapView {...props} className="absolute inset-0" />
      ) : (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
    </div>
  );
}
