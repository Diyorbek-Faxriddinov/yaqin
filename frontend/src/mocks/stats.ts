import type { StatsDay, StatsSeries, StatsTotals } from "@/lib/api/types";
import { demoState, type DemoBusinessRecord } from "./demo-state";
import { BUSINESSES } from "./fixtures/businesses";
import { seededRandom } from "./fixtures/ids";

/**
 * Biznes statistikasi: kunlik hisoblagichlar (shaxsiy maʼlumotsiz — faqat son).
 * ⚠ Demo: fixture bizneslar uchun har kunga deterministik namunaviy qiymatlar qo'shiladi, aks holda
 * grafiklar bo'sh bo'lardi. Saytdagi haqiqiy bosishlar ularning ustiga qo'shiladi.
 * Backend (3-bosqich) kunlik agregat jadvalidan (business_id, date, counts) qaytaradi.
 */

export const EVENT_KEYS = {
  profile_view: "profileViews",
  call_click: "calls",
  telegram_click: "telegramClicks",
  direction_click: "directionClicks",
} as const satisfies Record<string, keyof StatsTotals>;

export type StatsEventType = keyof typeof EVENT_KEYS;

const FIXTURE_IDS = new Set(BUSINESSES.map((b) => b.id));
const DAY_MS = 86_400_000;

const empty = (): StatsTotals => ({
  profileViews: 0,
  calls: 0,
  telegramClicks: 0,
  directionClicks: 0,
});

function add(target: StatsTotals, source: StatsTotals) {
  target.profileViews += source.profileViews;
  target.calls += source.calls;
  target.telegramClicks += source.telegramClicks;
  target.directionClicks += source.directionClicks;
}

/** Toshkent vaqti bo'yicha sana: YYYY-MM-DD */
export function tashkentDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Oxirgi N kun (bugun bilan), eskisidan yangisiga */
export function lastDays(days: number, now = new Date()): string[] {
  return Array.from({ length: days }, (_, i) =>
    tashkentDate(new Date(now.getTime() - (days - 1 - i) * DAY_MS)),
  );
}

export function recordEvent(type: StatsEventType, businessId: string, now = new Date()) {
  const key = `${businessId}|${tashkentDate(now)}`;
  const counts = demoState.statsEvents.get(key) ?? empty();
  counts[EVENT_KEYS[type]] += 1;
  demoState.statsEvents.set(key, counts);
}

/** ⚠ Namunaviy kunlik qiymatlar: mashhurroq (sharhi ko'p) biznesga ko'proq, dam olish kunlari ko'proq */
function demoBaseline(business: DemoBusinessRecord, date: string): StatsTotals {
  if (!FIXTURE_IDS.has(business.id) || date < business.createdAt.slice(0, 10)) return empty();
  const random = seededRandom(`stats:${business.id}:${date}`);
  const popularity = Math.log2(business.rating.count + 4);
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const weekend = weekday === 0 || weekday === 6 ? 1.3 : 1;
  const views = Math.round((popularity * 2 + random() * popularity * 4) * weekend);
  return {
    profileViews: views,
    calls: Math.round(views * (0.06 + random() * 0.1)),
    telegramClicks: Math.round(views * random() * 0.04),
    directionClicks: Math.round(views * (0.05 + random() * 0.08)),
  };
}

function dayCounts(business: DemoBusinessRecord, date: string): StatsTotals {
  const counts = demoBaseline(business, date);
  const real = demoState.statsEvents.get(`${business.id}|${date}`);
  if (real) add(counts, real);
  return counts;
}

/** Bir yoki bir nechta biznesning kunlik qatori va jami */
export function statsSeries(businesses: DemoBusinessRecord[], days: number): StatsSeries {
  const dates = lastDays(days);
  const totals = empty();
  const daily: StatsDay[] = dates.map((date) => {
    const day = empty();
    for (const business of businesses) add(day, dayCounts(business, date));
    add(totals, day);
    return { date, ...day };
  });
  return { from: dates[0] ?? "", to: dates.at(-1) ?? "", days, totals, daily };
}

/** Davr ichidagi jami (eng ko'p ko'rilganlar ro'yxati uchun) */
export function businessTotals(business: DemoBusinessRecord, days: number): StatsTotals {
  const totals = empty();
  for (const date of lastDays(days)) add(totals, dayCounts(business, date));
  return totals;
}

/** ?days= — 7, 30 yoki 90 (standart 30) */
export function parseDays(request: Request): number {
  const days = Number(new URL(request.url).searchParams.get("days") ?? 30);
  return days === 7 || days === 90 ? days : 30;
}
