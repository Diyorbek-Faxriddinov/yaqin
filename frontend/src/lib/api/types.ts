import type { components } from "./schema";

// Generatsiya qilingan OpenAPI tiplari uchun qisqa nomlar (schema.d.ts ni qo'lda tahrirlamang)
type Schemas = components["schemas"];

export type ApiError = Schemas["Error"];
export type CategoryRef = Schemas["CategoryRef"];
export type CategoryNode = Schemas["CategoryNode"];
export type CategoryDetail = Schemas["CategoryDetail"];
export type District = Schemas["District"];
export type BusinessSummary = Schemas["BusinessSummary"];
export type BusinessDetail = Schemas["BusinessDetail"];
export type BusinessPage = Schemas["BusinessPage"];
export type WeeklySchedule = Schemas["WeeklySchedule"];
export type TimeInterval = Schemas["TimeInterval"];
export type SearchSuggestions = Schemas["SearchSuggestions"];
export type BusinessSort = "recommended" | "rating" | "distance" | "newest";
