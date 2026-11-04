/**
 * Kabinet URL parametrlari. "use client" fayllaridan alohida — server sahifasi ham ishlatadi.
 * Bo'limlar admin tahririniki bilan bir xil (holat va rozilikdan tashqari) + takliflar.
 */
export const CABINET_TABS = [
  "basic",
  "location",
  "photos",
  "hours",
  "contacts",
  "catalog",
  "changes",
  "stats",
] as const;
export type CabinetTab = (typeof CABINET_TABS)[number];

/** ?bolim= → kabinetdagi tab */
export function parseCabinetTab(value: string | undefined): CabinetTab {
  return (CABINET_TABS as readonly string[]).includes(value ?? "")
    ? (value as CabinetTab)
    : "basic";
}
