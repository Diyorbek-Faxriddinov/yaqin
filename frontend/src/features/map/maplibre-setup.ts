"use client";

import { getVersion, setWorkerUrl } from "maplibre-gl";

// Worker bundle'dan tashqarida (scripts/copy-vendor.mjs) — bir marta sozlanadi
let workerConfigured = false;
export function configureWorker() {
  if (workerConfigured) return;
  setWorkerUrl(`/vendor/maplibre-gl-worker-${getVersion()}.mjs`);
  workerConfigured = true;
}

type Translate = (key: string) => string;

/** Boshqaruv tugmalari va maslahatlar (ekran o'quvchilar uchun ham) tanlangan tilda */
export function controlsLocale(t: Translate): Record<string, string> {
  return {
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
  };
}

/** OSM litsenziyasi talab qiladigan manbalar yozuvi yig'iq holatda boshlanadi */
export function collapseAttribution(container: HTMLElement) {
  const attribution = container.querySelector(".maplibregl-ctrl-attrib");
  attribution?.classList.remove("maplibregl-compact-show");
  attribution?.removeAttribute("open");
}
