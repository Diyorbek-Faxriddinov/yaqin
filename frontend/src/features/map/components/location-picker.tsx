"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import { AttributionControl, Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import { useTranslations } from "next-intl";
import type { GeoPoint } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { MAP_STYLE_URL } from "../config";
import { collapseAttribution, configureWorker, controlsLocale } from "../maplibre-setup";

export type LocationPickerProps = {
  value: GeoPoint | null;
  /** Qiymat bo'lmaganda xarita markazi (masalan, tuman markazi) */
  fallbackCenter: GeoPoint;
  onChange: (point: GeoPoint) => void;
  disabled?: boolean;
  label: string;
  className?: string;
};

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Admin: xaritani bosish yoki belgini surish orqali biznes joylashuvini tanlash */
export function LocationPicker({
  value,
  fallbackCenter,
  onChange,
  disabled,
  label,
  className,
}: LocationPickerProps) {
  const t = useTranslations("MapPage");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  useEffect(() => {
    onChangeRef.current = onChange;
    disabledRef.current = disabled;
  }, [onChange, disabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    configureWorker();
    const start = value ?? fallbackCenter;
    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [start.lng, start.lat],
      zoom: value ? 17 : 14,
      attributionControl: false,
      maxZoom: 19,
      locale: controlsLocale(t),
    });
    mapRef.current = map;
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => collapseAttribution(container));

    const marker = new Marker({ color: "#0f766e", draggable: !disabled });
    markerRef.current = marker;
    if (value) marker.setLngLat([value.lng, value.lat]).addTo(map);
    marker.on("dragend", () => {
      const { lng, lat } = marker.getLngLat();
      onChangeRef.current({ lat: round(lat), lng: round(lng) });
    });
    map.on("click", (event) => {
      if (disabledRef.current) return;
      onChangeRef.current({ lat: round(event.lngLat.lat), lng: round(event.lngLat.lng) });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Xarita bir marta yaratiladi; qiymat o'zgarishi pastdagi effektda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tashqaridan kelgan qiymat (GPS tugmasi yoki bosish): belgini ko'chirish va markazlash
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !value) return;
    marker.setLngLat([value.lng, value.lat]);
    if (!marker.getElement().isConnected) marker.addTo(map);
    map.easeTo({ center: [value.lng, value.lat], zoom: Math.max(map.getZoom(), 17) });
  }, [value]);

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-muted", className)}>
      <div ref={containerRef} role="region" aria-label={label} className="h-full w-full" />
    </div>
  );
}
