"use client";

import { useTranslations } from "next-intl";
import type { WeeklySchedule } from "@/lib/api/types";
import { getTashkentTime } from "@/lib/open-status";
import { cn } from "@/lib/utils";
import { useCurrentMinute } from "../use-current-minute";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Haftalik ish vaqti jadvali; bugungi kun (foydalanuvchi vaqti bo'yicha) ajratib ko'rsatiladi */
export function WeeklyHours({ schedule }: { schedule: WeeklySchedule | null }) {
  const t = useTranslations("BusinessPage");
  const tBusiness = useTranslations("Business");
  const now = useCurrentMinute();
  const today = now ? getTashkentTime(now).weekday : null;

  if (!schedule) {
    return <p className="text-sm text-muted-foreground">{t("hoursUnknown")}</p>;
  }

  if (schedule.is24x7) {
    return (
      <p className="font-medium">
        {t("everyDay")}: {t("allDay")}
      </p>
    );
  }

  return (
    <table className="w-full max-w-sm text-sm">
      <caption className="sr-only">{t("sections.hours")}</caption>
      <tbody>
        {WEEKDAYS.map((weekday) => {
          const day = schedule.days.find((d) => d.weekday === weekday);
          const isToday = weekday === today;
          return (
            <tr
              key={weekday}
              aria-current={isToday ? "date" : undefined}
              className={cn("border-b last:border-0", isToday && "font-semibold")}
            >
              <th scope="row" className="py-2 pr-4 text-left font-[inherit]">
                {tBusiness(`weekdaysLong.${weekday}`)}
                {isToday && (
                  <span className="ml-2 rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary-soft-foreground">
                    {t("today")}
                  </span>
                )}
              </th>
              <td className="py-2 text-right tabular-nums">
                {day && day.intervals.length > 0 ? (
                  day.intervals.map((interval) => `${interval.open}–${interval.close}`).join(", ")
                ) : (
                  <span className="text-muted-foreground">{t("dayOff")}</span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
