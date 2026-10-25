import type { WeeklySchedule } from "@/lib/api/types";

/**
 * Biznesning joriy ish holatini hisoblaydi (Asia/Tashkent vaqti bo'yicha).
 *
 * - Interval `close <= open` bo'lsa, keyingi kunga o'tadi (18:00–02:00).
 * - "24:00" — kun oxiri.
 * - Yopilishga 60 daqiqa yoki kamroq qolsa — "closingSoon".
 */

export const CLOSING_SOON_MINUTES = 60;
const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

export type OpenStatusResult =
  | { state: "unknown" }
  | { state: "open"; is24x7: true }
  | { state: "open" | "closingSoon"; is24x7: false; closesAt: string }
  | { state: "closed"; opensAt: { time: string; daysFromNow: number; weekday: number } | null };

/** Toshkent vaqti: ISO hafta kuni (1 = dushanba) va kun boshidan daqiqalar */
export function getTashkentTime(now: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tashkent",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatTime(minutesOfDay: number): string {
  const m = ((minutesOfDay % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Jadvalni haftaning boshidan (dushanba 00:00) hisoblangan daqiqa oraliqlariga aylantiradi */
function weeklyRanges(schedule: WeeklySchedule): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const day of schedule.days) {
    const dayStart = (day.weekday - 1) * MINUTES_PER_DAY;
    for (const interval of day.intervals) {
      const open = toMinutes(interval.open);
      let close = toMinutes(interval.close);
      if (close <= open) close += MINUTES_PER_DAY;
      ranges.push([dayStart + open, dayStart + close]);
    }
  }
  return ranges;
}

export function computeOpenStatus(
  schedule: WeeklySchedule | null | undefined,
  now: Date,
): OpenStatusResult {
  if (!schedule) return { state: "unknown" };
  if (schedule.is24x7) return { state: "open", is24x7: true };

  const { weekday, minutes } = getTashkentTime(now);
  const current = (weekday - 1) * MINUTES_PER_DAY + minutes;
  const ranges = weeklyRanges(schedule);

  // Yakshanbadan dushanbaga o'tadigan intervallar uchun bir haftalik siljish bilan ham tekshiramiz
  for (const [start, end] of ranges) {
    for (const shift of [0, -MINUTES_PER_WEEK]) {
      const s = start + shift;
      const e = end + shift;
      if (current >= s && current < e) {
        const remaining = e - current;
        return {
          state: remaining <= CLOSING_SOON_MINUTES ? "closingSoon" : "open",
          is24x7: false,
          closesAt: formatTime(e),
        };
      }
    }
  }

  // Keyingi ochilish: hozirdan keyingi eng yaqin boshlanish (bir hafta ichida)
  let best: number | null = null;
  for (const [start] of ranges) {
    const delta = (start - current + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
    if (best === null || delta < best) best = delta;
  }
  if (best === null) return { state: "closed", opensAt: null };

  const opensAtAbs = current + best;
  const daysFromNow =
    Math.floor(opensAtAbs / MINUTES_PER_DAY) - Math.floor(current / MINUTES_PER_DAY);
  return {
    state: "closed",
    opensAt: {
      time: formatTime(opensAtAbs),
      daysFromNow,
      weekday: ((weekday - 1 + daysFromNow) % 7) + 1,
    },
  };
}
