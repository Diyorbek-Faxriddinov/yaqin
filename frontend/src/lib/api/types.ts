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
export type Item = Schemas["Item"];
export type ItemPrice = Schemas["ItemPrice"];
export type Review = Schemas["Review"];
export type ReviewPage = Schemas["ReviewPage"];
export type MapMarker = Schemas["MapMarker"];
export type Me = Schemas["Me"];
export type MyReview = Schemas["MyReview"];
export type ReviewInput = Schemas["ReviewInput"];
export type Complaint = Schemas["Complaint"];
export type ComplaintInput = Schemas["ComplaintInput"];
export type ComplaintReason = Schemas["ComplaintReason"];
export type BusinessSort = "recommended" | "rating" | "distance" | "newest";
