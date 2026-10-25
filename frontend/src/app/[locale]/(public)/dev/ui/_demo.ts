import type { BusinessCardProps } from "@/features/business/components/business-card";

// ⚠ Faqat dizayn ko'rgazmasi uchun namunaviy maʼlumotlar — haqiqiy bizneslar emas.

const som = (value: number) => ({ amount: value * 100, currency: "UZS" as const });

export const DEMO_CATEGORIES = [
  { name: "Doʻkonlar", iconKey: "shopping" },
  { name: "Ovqatlanish", iconKey: "food" },
  { name: "Goʻzallik va parvarish", iconKey: "beauty" },
  { name: "Uy va maishiy xizmatlar", iconKey: "home-services" },
  { name: "Avto", iconKey: "auto" },
  { name: "Sogʻliq", iconKey: "health" },
  { name: "Taʼlim", iconKey: "education" },
  { name: "Sport va dam olish", iconKey: "sport" },
  { name: "Sayohat va mehmonxonalar", iconKey: "travel" },
  { name: "Toʻy va tadbirlar", iconKey: "events" },
  { name: "Uy hayvonlari", iconKey: "pets" },
  { name: "Professional xizmatlar", iconKey: "professional" },
] as const;

export const DEMO_BUSINESSES: Omit<BusinessCardProps, "className">[] = [
  {
    href: "/dev/ui#kartalar",
    name: "Demo sartaroshxona",
    categoryName: "Sartaroshxona",
    categoryIconKey: "beauty",
    districtName: "Chilonzor",
    rating: { average: 4.8, count: 37 },
    priceRange: { min: som(40000), max: som(80000) },
    openStatus: { state: "open", detail: "21:00 gacha" },
    distanceMeters: 350,
  },
  {
    href: "/dev/ui#kartalar",
    name: "Demo oilaviy kafe va choyxona",
    categoryName: "Kafe",
    categoryIconKey: "food",
    districtName: "Yunusobod",
    rating: { average: 4.3, count: 112 },
    priceRange: { min: som(25000), max: som(25000) },
    openStatus: { state: "closingSoon", detail: "22:00 gacha" },
    distanceMeters: 1240,
  },
  {
    href: "/dev/ui#kartalar",
    name: "Demo santexnik xizmati",
    categoryName: "Santexnika",
    categoryIconKey: "home-services",
    districtName: "Mirzo Ulugʻbek",
    rating: null,
    priceRange: null,
    openStatus: { state: "closed", detail: "ertaga 09:00 da" },
    distanceMeters: null,
  },
  {
    href: "/dev/ui#kartalar",
    name: "Demo avtoservis",
    categoryName: "Avtomobil taʼmiri",
    categoryIconKey: "auto",
    districtName: "Sergeli",
    rating: { average: 3.9, count: 8 },
    priceRange: { min: som(150000), max: som(1200000) },
    openStatus: { state: "unknown" },
    distanceMeters: 12600,
  },
];

export const COLOR_TOKENS = [
  { token: "primary", hex: "#0F766E", use: "Asosiy tugmalar, havolalar, faol holat" },
  { token: "primary-hover", hex: "#115E59", use: "Asosiy tugma hover" },
  { token: "primary-soft", hex: "#F0FDFA", use: "Yumshoq fon: kategoriya, belgi" },
  { token: "highlight", hex: "#F59E0B", use: "Reyting yulduzlari (matn emas)" },
  { token: "success", hex: "#047857", use: "“Ochiq” holati" },
  { token: "warning", hex: "#B45309", use: "“Tez orada yopiladi”, demo ogohlantirish" },
  { token: "destructive", hex: "#B91C1C", use: "Xatolar, oʻchirish" },
  { token: "foreground", hex: "#1C1917", use: "Asosiy matn" },
  { token: "muted-foreground", hex: "#57534E", use: "Ikkinchi darajali matn" },
  { token: "border", hex: "#E7E5E4", use: "Kartalar, ajratgichlar" },
  { token: "input", hex: "#928B86", use: "Forma elementlari chegarasi" },
  { token: "muted", hex: "#F5F5F4", use: "Ikkinchi darajali fon" },
] as const;
