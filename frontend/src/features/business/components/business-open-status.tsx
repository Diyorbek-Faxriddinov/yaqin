"use client";

import { useTranslations } from "next-intl";
import type { WeeklySchedule } from "@/lib/api/types";
import { computeOpenStatus } from "@/lib/open-status";
import type { OpenStatus } from "../types";
import { useCurrentMinute } from "../use-current-minute";
import { OpenStatusBadge } from "./open-status-badge";

export function BusinessOpenStatus({
  schedule,
  className,
}: {
  schedule: WeeklySchedule | null;
  className?: string;
}) {
  const now = useCurrentMinute();
  const t = useTranslations("Business");

  if (!schedule) return <OpenStatusBadge status={{ state: "unknown" }} className={className} />;

  if (now === null) {
    // Joy egallovchi: kartaning balandligi o'zgarmasligi uchun
    return <span aria-hidden="true" className="inline-block h-5 w-24 rounded-full bg-muted" />;
  }

  const result = computeOpenStatus(schedule, now);
  let status: OpenStatus;

  switch (result.state) {
    case "unknown":
      status = { state: "unknown" };
      break;
    case "open":
    case "closingSoon":
      status = {
        state: result.state,
        detail: result.is24x7
          ? t("statusDetail.allDay")
          : t("statusDetail.until", { time: result.closesAt }),
      };
      break;
    case "closed": {
      const opensAt = result.opensAt;
      let detail: string | undefined;
      if (opensAt?.daysFromNow === 0) {
        detail = t("statusDetail.opensToday", { time: opensAt.time });
      } else if (opensAt?.daysFromNow === 1) {
        detail = t("statusDetail.opensTomorrow", { time: opensAt.time });
      } else if (opensAt) {
        detail = t("statusDetail.opensOn", {
          weekday: t(`weekdaysShort.${opensAt.weekday}` as "weekdaysShort.1"),
          time: opensAt.time,
        });
      }
      status = { state: "closed", detail };
      break;
    }
  }

  return <OpenStatusBadge status={status} className={className} />;
}
