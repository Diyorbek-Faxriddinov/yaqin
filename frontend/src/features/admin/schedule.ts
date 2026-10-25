import type { WeeklySchedule } from "@/lib/api/types";

/**
 * Ish vaqti muharriri uchun sof funksiyalar. Muharrir har bir kunni alohida saqlaydi
 * (dam olish kuni — intervalsiz), API'ga yuborishda WeeklySchedule'ga aylantiriladi.
 */

export type Interval = { open: string; close: string };
export type DayState = { weekday: number; open: boolean; intervals: Interval[] };
export type EditorState = { is24x7: boolean; days: DayState[] };

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const DEFAULT_INTERVAL: Interval = { open: "09:00", close: "18:00" };

export function fromSchedule(schedule: WeeklySchedule | null): EditorState {
  return {
    is24x7: schedule?.is24x7 ?? false,
    days: WEEKDAYS.map((weekday) => {
      const day = schedule?.days.find((d) => d.weekday === weekday);
      const intervals = day?.intervals.length ? day.intervals.map((i) => ({ ...i })) : [];
      return {
        weekday,
        open: intervals.length > 0,
        intervals: intervals.length ? intervals : [{ ...DEFAULT_INTERVAL }],
      };
    }),
  };
}

export function toSchedule(state: EditorState): WeeklySchedule {
  if (state.is24x7) return { is24x7: true, days: [] };
  return {
    is24x7: false,
    days: state.days
      .filter((day) => day.open && day.intervals.length > 0)
      .map((day) => ({ weekday: day.weekday, intervals: day.intervals.map((i) => ({ ...i })) })),
  };
}

export type Preset = "daily" | "weekdays" | "always";

export function applyPreset(preset: Preset): EditorState {
  if (preset === "always") return { ...fromSchedule(null), is24x7: true };
  const openDays = preset === "daily" ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5, 6];
  const interval =
    preset === "daily" ? { open: "09:00", close: "21:00" } : { open: "09:00", close: "18:00" };
  return {
    is24x7: false,
    days: WEEKDAYS.map((weekday) => ({
      weekday,
      open: openDays.includes(weekday),
      intervals: [{ ...interval }],
    })),
  };
}

/** Berilgan kunning ish vaqtini qolgan barcha ochiq kunlarga nusxalaydi */
export function copyToAll(state: EditorState, weekday: number): EditorState {
  const source = state.days.find((d) => d.weekday === weekday);
  if (!source) return state;
  return {
    ...state,
    days: state.days.map((day) => ({
      ...day,
      open: source.open,
      intervals: source.intervals.map((i) => ({ ...i })),
    })),
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Xatolar: kun bo'yicha. Yopilish ochilishdan oldin bo'lishi mumkin (yarim tundan keyin). */
export function validateEditor(state: EditorState): Record<number, string> {
  const errors: Record<number, string> = {};
  if (state.is24x7) return errors;
  for (const day of state.days) {
    if (!day.open) continue;
    for (const interval of day.intervals) {
      if (!TIME.test(interval.open) || !(TIME.test(interval.close) || interval.close === "24:00")) {
        errors[day.weekday] = "format";
      } else if (interval.open === interval.close) {
        errors[day.weekday] = "same";
      }
    }
  }
  return errors;
}
