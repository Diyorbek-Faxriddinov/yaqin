import { describe, expect, it } from "vitest";
import { applyPreset, copyToAll, fromSchedule, toSchedule, validateEditor } from "./schedule";

describe("ish vaqti muharriri", () => {
  it("jadval → muharrir → jadval aylanmasi", () => {
    const schedule = {
      is24x7: false,
      days: [
        {
          weekday: 1,
          intervals: [
            { open: "09:00", close: "13:00" },
            { open: "14:00", close: "18:00" },
          ],
        },
        { weekday: 5, intervals: [{ open: "18:00", close: "02:00" }] },
      ],
    };
    expect(toSchedule(fromSchedule(schedule))).toEqual(schedule);
  });

  it("null jadval — barcha kunlar yopiq, standart vaqt bilan", () => {
    const state = fromSchedule(null);
    expect(state.days.every((d) => !d.open)).toBe(true);
    expect(toSchedule(state)).toEqual({ is24x7: false, days: [] });
  });

  it("andozalar", () => {
    expect(toSchedule(applyPreset("always"))).toEqual({ is24x7: true, days: [] });
    expect(toSchedule(applyPreset("daily")).days).toHaveLength(7);
    const weekdays = toSchedule(applyPreset("weekdays"));
    expect(weekdays.days.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("bir kunni hammasiga nusxalash", () => {
    const state = applyPreset("weekdays");
    state.days[0]!.intervals = [{ open: "10:00", close: "20:00" }];
    const copied = copyToAll(state, 1);
    expect(copied.days.every((d) => d.open && d.intervals[0]?.open === "10:00")).toBe(true);
  });

  it("validatsiya: bir xil vaqt va noto'g'ri format", () => {
    const state = applyPreset("daily");
    state.days[0]!.intervals = [{ open: "09:00", close: "09:00" }];
    state.days[1]!.intervals = [{ open: "9", close: "18:00" }];
    expect(validateEditor(state)).toEqual({ 1: "same", 2: "format" });
  });

  it("yarim tundan keyin yopilish — xato emas", () => {
    const state = applyPreset("daily");
    state.days[0]!.intervals = [{ open: "18:00", close: "02:00" }];
    expect(validateEditor(state)).toEqual({});
  });
});
