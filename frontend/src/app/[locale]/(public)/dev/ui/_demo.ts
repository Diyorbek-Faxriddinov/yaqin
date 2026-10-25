import type { BusinessSummary, WeeklySchedule } from "@/lib/api/types";

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

const daily = (open: string, close: string): WeeklySchedule => ({
  is24x7: false,
  days: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, intervals: [{ open, close }] })),
});

function demoBusiness(
  index: number,
  overrides: Partial<BusinessSummary> & Pick<BusinessSummary, "name" | "category">,
): BusinessSummary {
  return {
    id: `00000000-0000-4000-a000-00000000000${index}`,
    slug: `demo-${index}`,
    district: { slug: "chilonzor", name: "Chilonzor" },
    location: { lat: 41.2755, lng: 69.2042 },
    coverImage: null,
    rating: { average: null, count: 0 },
    priceRange: null,
    schedule: null,
    distanceMeters: null,
    isVerified: false,
    createdAt: "2026-10-20T07:00:00.000Z",
    ...overrides,
  };
}

const category = (slug: string, name: string, iconKey: string) => ({
  id: "00000000-0000-4000-a000-000000000100",
  slug,
  name,
  iconKey,
});

export const DEMO_BUSINESSES: BusinessSummary[] = [
  demoBusiness(1, {
    name: "Demo sartaroshxona",
    category: category("sartaroshxonalar", "Sartaroshxona", "beauty"),
    rating: { average: 4.8, count: 37 },
    priceRange: { min: som(40000), max: som(80000) },
    schedule: daily("09:00", "21:00"),
    distanceMeters: 350,
    isVerified: true,
  }),
  demoBusiness(2, {
    name: "Demo oilaviy kafe va choyxona",
    category: category("kafelar", "Kafe", "food"),
    district: { slug: "yunusobod", name: "Yunusobod" },
    rating: { average: 4.3, count: 112 },
    priceRange: { min: som(25000), max: som(25000) },
    schedule: daily("10:00", "23:00"),
    distanceMeters: 1240,
  }),
  demoBusiness(3, {
    name: "Demo santexnik xizmati",
    category: category("santexnika", "Santexnika", "home-services"),
    district: { slug: "mirzo-ulugbek", name: "Mirzo Ulugʻbek" },
    schedule: { is24x7: false, days: [] },
  }),
  demoBusiness(4, {
    name: "Demo avtoservis",
    category: category("avtoservis", "Avtomobil taʼmiri", "auto"),
    district: { slug: "sergeli", name: "Sergeli" },
    rating: { average: 3.9, count: 8 },
    priceRange: { min: som(150000), max: som(1200000) },
    distanceMeters: 12600,
  }),
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
