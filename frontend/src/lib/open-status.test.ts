import { describe, expect, it } from "vitest";
import type { WeeklySchedule } from "@/lib/api/types";
import { computeOpenStatus, getTashkentTime } from "./open-status";

/** Toshkent vaqti (UTC+5) bo'yicha sana: 2026-10-26 — dushanba */
function tashkent(isoLocal: string): Date {
  return new Date(`${isoLocal}+05:00`);
}

const everyDay = (open: string, close: string): WeeklySchedule => ({
  is24x7: false,
  days: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, intervals: [{ open, close }] })),
});

describe("getTashkentTime", () => {
  it("UTC vaqtini Toshkent vaqtiga o'giradi", () => {
    // 2026-10-25T20:30Z = Toshkentda dushanba 01:30
    expect(getTashkentTime(new Date("2026-10-25T20:30:00Z"))).toEqual({
      weekday: 1,
      minutes: 90,
    });
  });
});

describe("computeOpenStatus", () => {
  it("jadval bo'lmasa — noma'lum", () => {
    expect(computeOpenStatus(null, tashkent("2026-10-26T12:00:00"))).toEqual({
      state: "unknown",
    });
  });

  it("24/7", () => {
    expect(computeOpenStatus({ is24x7: true, days: [] }, tashkent("2026-10-26T03:00:00"))).toEqual({
      state: "open",
      is24x7: true,
    });
  });

  it("ish vaqtida — ochiq va yopilish vaqti", () => {
    expect(computeOpenStatus(everyDay("09:00", "21:00"), tashkent("2026-10-26T12:00:00"))).toEqual({
      state: "open",
      is24x7: false,
      closesAt: "21:00",
    });
  });

  it("yopilishga 60 daqiqa qolganda — tez orada yopiladi", () => {
    expect(
      computeOpenStatus(everyDay("09:00", "21:00"), tashkent("2026-10-26T20:00:00")).state,
    ).toBe("closingSoon");
    expect(
      computeOpenStatus(everyDay("09:00", "21:00"), tashkent("2026-10-26T19:59:00")).state,
    ).toBe("open");
  });

  it("yopilish daqiqasida — yopiq, ertaga ochiladi", () => {
    expect(computeOpenStatus(everyDay("09:00", "21:00"), tashkent("2026-10-26T21:00:00"))).toEqual({
      state: "closed",
      opensAt: { time: "09:00", daysFromNow: 1, weekday: 2 },
    });
  });

  it("ertalab ochilishdan oldin — bugun ochiladi", () => {
    expect(computeOpenStatus(everyDay("09:00", "21:00"), tashkent("2026-10-26T07:30:00"))).toEqual({
      state: "closed",
      opensAt: { time: "09:00", daysFromNow: 0, weekday: 1 },
    });
  });

  it("yarim tundan keyin yopiladigan joy (18:00–02:00)", () => {
    const night = everyDay("18:00", "02:00");
    expect(computeOpenStatus(night, tashkent("2026-10-26T23:30:00"))).toEqual({
      state: "open",
      is24x7: false,
      closesAt: "02:00",
    });
    expect(computeOpenStatus(night, tashkent("2026-10-27T01:30:00")).state).toBe("closingSoon");
    expect(computeOpenStatus(night, tashkent("2026-10-27T02:30:00"))).toEqual({
      state: "closed",
      opensAt: { time: "18:00", daysFromNow: 0, weekday: 2 },
    });
  });

  it("yakshanba kechasidan dushanbaga o'tadigan interval", () => {
    const sundayNight: WeeklySchedule = {
      is24x7: false,
      days: [{ weekday: 7, intervals: [{ open: "20:00", close: "03:00" }] }],
    };
    // Dushanba 01:00 — yakshanba intervali hali davom etmoqda
    expect(computeOpenStatus(sundayNight, tashkent("2026-10-26T01:00:00")).state).toBe("open");
  });

  it("tushlik tanaffusi", () => {
    const lunch: WeeklySchedule = {
      is24x7: false,
      days: [
        {
          weekday: 1,
          intervals: [
            { open: "09:00", close: "13:00" },
            { open: "14:00", close: "18:00" },
          ],
        },
      ],
    };
    expect(computeOpenStatus(lunch, tashkent("2026-10-26T13:30:00"))).toEqual({
      state: "closed",
      opensAt: { time: "14:00", daysFromNow: 0, weekday: 1 },
    });
  });

  it("dam olish kunlari: shanba-yakshanba yopiq bo'lsa, dushanbaga o'tadi", () => {
    const weekdays: WeeklySchedule = {
      is24x7: false,
      days: [1, 2, 3, 4, 5].map((weekday) => ({
        weekday,
        intervals: [{ open: "09:00", close: "18:00" }],
      })),
    };
    // 2026-10-31 — shanba
    expect(computeOpenStatus(weekdays, tashkent("2026-10-31T10:00:00"))).toEqual({
      state: "closed",
      opensAt: { time: "09:00", daysFromNow: 2, weekday: 1 },
    });
  });

  it("24:00 gacha ishlaydigan joy", () => {
    expect(computeOpenStatus(everyDay("10:00", "24:00"), tashkent("2026-10-26T23:10:00"))).toEqual({
      state: "closingSoon",
      is24x7: false,
      closesAt: "00:00",
    });
  });

  it("jadvalda kun bo'lmasa — yopiq, ochilish noma'lum", () => {
    expect(computeOpenStatus({ is24x7: false, days: [] }, tashkent("2026-10-26T12:00:00"))).toEqual(
      { state: "closed", opensAt: null },
    );
  });
});
