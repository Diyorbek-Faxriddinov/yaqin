"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  GeolocateControl,
  getVersion,
  Map as MapLibreMap,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from "maplibre-gl";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { MAP_STYLE_URL, TASHKENT_CENTER, type MapPoint } from "../config";

export type MapViewProps = {
  points: MapPoint[];
  selectedSlug?: string | null;
  onSelect?: (slug: string | null) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  /** Sahifa ichidagi kichik xarita: aylantirishni "o'g'irlamaydi" (ikki barmoq / Ctrl) */
  cooperative?: boolean;
  showGeolocate?: boolean;
  label: string;
  className?: string;
};

// Worker bundle'dan tashqarida (scripts/copy-vendor.mjs) — bir marta sozlanadi
let workerConfigured = false;
function configureWorker() {
  if (workerConfigured) return;
  setWorkerUrl(`/vendor/maplibre-gl-worker-${getVersion()}.mjs`);
  workerConfigured = true;
}

const SOURCE_ID = "businesses";

function toGeoJSON(points: MapPoint[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      properties: { slug: point.slug, name: point.name },
    })),
  };
}

export function MapView({
  points,
  selectedSlug = null,
  onSelect,
  center,
  zoom = 11,
  cooperative = false,
  showGeolocate = false,
  label,
  className,
}: MapViewProps) {
  const t = useTranslations("MapPage");
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // Hodisa ishlovchilari eng so'nggi callback'ni ko'rishi uchun
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Xaritani bir marta yaratish
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    configureWorker();

    const initialCenter = center ?? TASHKENT_CENTER;
    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [initialCenter.lng, initialCenter.lat],
      zoom,
      attributionControl: false,
      cooperativeGestures: cooperative,
      maxZoom: 18,
      // Boshqaruv tugmalari va maslahatlar (ekran o'quvchilar uchun ham) tanlangan tilda
      locale: {
        "NavigationControl.ZoomIn": t("controls.zoomIn"),
        "NavigationControl.ZoomOut": t("controls.zoomOut"),
        "NavigationControl.ResetBearing": t("controls.resetBearing"),
        "GeolocateControl.FindMyLocation": t("controls.findMyLocation"),
        "GeolocateControl.LocationNotAvailable": t("controls.locationNotAvailable"),
        "AttributionControl.ToggleAttribution": t("controls.toggleAttribution"),
        "AttributionControl.MapFeedback": t("controls.mapFeedback"),
        "CooperativeGesturesHandler.WindowsHelpText": t("controls.windowsHelp"),
        "CooperativeGesturesHandler.MacHelpText": t("controls.macHelp"),
        "CooperativeGesturesHandler.MobileHelpText": t("controls.mobileHelp"),
        "Map.Title": t("controls.mapTitle"),
      },
    });
    mapRef.current = map;

    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    if (showGeolocate) {
      map.addControl(
        new GeolocateControl({
          positionOptions: { enableHighAccuracy: false },
          trackUserLocation: false,
        }),
        "top-right",
      );
    }

    map.on("error", (event) => {
      // Uslub yoki tile yuklanmasa — tushunarli xabar (bitta tile xatosi kartani buzmaydi)
      if (!map.isStyleLoaded()) setFailed(true);
      console.error(event.error);
    });

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toGeoJSON([]),
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 15,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0f766e",
          "circle-opacity": 0.9,
          "circle-radius": ["step", ["get", "point_count"], 16, 10, 20, 30, 26],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 13,
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "points",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#0f766e",
          "circle-radius": 8,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "point-selected",
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "slug"], ""],
        paint: {
          "circle-color": "#f59e0b",
          "circle-radius": 11,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.on("click", "clusters", async (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0];
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        if (!feature || clusterId === undefined) return;
        const source = map.getSource<GeoJSONSource>(SOURCE_ID);
        const nextZoom = await source?.getClusterExpansionZoom(clusterId);
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
        map.easeTo({ center: [lng, lat], zoom: nextZoom ?? map.getZoom() + 2 });
      });

      map.on("click", "points", (event: MapLayerMouseEvent) => {
        const slug = event.features?.[0]?.properties?.slug as string | undefined;
        if (slug) onSelectRef.current?.(slug);
      });

      map.on("click", (event) => {
        const hits = map.queryRenderedFeatures(event.point, { layers: ["points", "clusters"] });
        if (hits.length === 0) onSelectRef.current?.(null);
      });

      for (const layer of ["clusters", "points"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }

      // Manbalar yozuvi (OSM litsenziyasi talabi) yig'iq holatda boshlanadi — kichik xaritani
      // yopib qo'ymasligi uchun; "i" tugmasi bilan ochiladi
      const attribution = container.querySelector(".maplibregl-ctrl-attrib");
      attribution?.classList.remove("maplibregl-compact-show");
      attribution?.removeAttribute("open");

      setLoaded(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Xarita faqat bir marta yaratiladi; keyingi o'zgarishlar alohida effektlarda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nuqtalar o'zgarganda
  useEffect(() => {
    if (!loaded) return;
    void mapRef.current?.getSource<GeoJSONSource>(SOURCE_ID)?.setData(toGeoJSON(points));
  }, [points, loaded]);

  // Tanlangan nuqta: ajratib ko'rsatish va markazga olib kelish
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    map.setFilter("point-selected", ["==", ["get", "slug"], selectedSlug ?? ""]);
    const point = points.find((p) => p.slug === selectedSlug);
    if (point) map.easeTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 14) });
  }, [selectedSlug, points, loaded]);

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      {/* MapLibre konteynerga position: relative beradi — o'lcham h-full/w-full orqali */}
      <div ref={containerRef} role="region" aria-label={label} className="h-full w-full" />
      {!loaded && !failed && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      )}
      {failed && (
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm"
        >
          {t("error")}
        </div>
      )}
    </div>
  );
}
