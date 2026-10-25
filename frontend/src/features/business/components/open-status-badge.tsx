import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { OpenStatus } from "../types";

const TONE = {
  open: "bg-success-soft text-success",
  closingSoon: "bg-warning-soft text-warning",
  closed: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
} as const;

const DOT = {
  open: "bg-success",
  closingSoon: "bg-warning",
  closed: "bg-muted-foreground",
  unknown: "bg-muted-foreground/50",
} as const;

/** Rang yagona belgi emas — holat har doim matn bilan ham yoziladi (WCAG 1.4.1) */
export function OpenStatusBadge({ status, className }: { status: OpenStatus; className?: string }) {
  const t = useTranslations("Business.status");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        TONE[status.state],
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[status.state])} />
      {t(status.state)}
      {status.detail && <span className="font-normal">· {status.detail}</span>}
    </span>
  );
}
