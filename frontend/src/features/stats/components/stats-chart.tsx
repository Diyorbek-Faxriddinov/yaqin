"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { StatsDay, StatsTotals } from "@/lib/api/types";
import { formatShortDay } from "@/lib/format/date";
import { groupDigits } from "@/lib/format/price";

export type StatsMetric = keyof StatsTotals;

const HEIGHT = 200;
const PAD = { top: 12, right: 8, bottom: 24, left: 36 };

/** Y o'qi uchun "toza" yuqori chegara: 1, 2, 5 × 10ⁿ */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((m) => m * power >= value) ?? 10;
  return step * power;
}

/** Ustun: tepasi 4px yumaloq, asosi to'g'ri burchak */
function barPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(4, width / 2, height);
  const bottom = y + height;
  return `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${bottom} Z`;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Kunlik ustunli grafik — bitta ko'rsatkich (legend shart emas, sarlavha nomlaydi).
 * Hover/teginishda qiymat; klaviatura va ekran o'quvchi uchun — yonidagi jadval ko'rinishi.
 */
export function StatsChart({
  daily,
  metric,
  label,
}: {
  daily: StatsDay[];
  metric: StatsMetric;
  label: string;
}) {
  const locale = useLocale();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const values = daily.map((day) => day[metric]);
  const max = niceMax(Math.max(0, ...values));
  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const band = daily.length > 0 ? plotWidth / daily.length : 0;
  // ≤24px, qo'shni ustunlar orasida kamida 2px bo'shliq
  const barWidth = Math.max(1, Math.min(24, band - 2));
  const y = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;
  const ticks = [0, max / 2, max];
  const labelIndexes = [...new Set([0, Math.floor((daily.length - 1) / 2), daily.length - 1])];
  const activeDay = active !== null ? daily[active] : undefined;

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setActive(null)}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label={label} className="block">
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 6}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {groupDigits(tick)}
              </text>
            </g>
          ))}
          {daily.map((day, index) => {
            const value = day[metric];
            const x = PAD.left + index * band + (band - barWidth) / 2;
            const height = (value / max) * plotHeight;
            return (
              <g key={day.date}>
                {value > 0 && (
                  <path
                    d={barPath(x, y(value), barWidth, height)}
                    className={
                      active === null || active === index ? "fill-chart-1" : "fill-chart-1/40"
                    }
                  />
                )}
                {/* Ustundan kattaroq sezgir maydon — kichik ustunni ham tanlash oson */}
                <rect
                  x={PAD.left + index * band}
                  y={PAD.top}
                  width={band}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setActive(index)}
                  onTouchStart={() => setActive(index)}
                />
              </g>
            );
          })}
          {labelIndexes.map((index) => {
            const day = daily[index];
            if (!day) return null;
            const anchor = index === 0 ? "start" : index === daily.length - 1 ? "end" : "middle";
            const x =
              anchor === "start"
                ? PAD.left
                : anchor === "end"
                  ? width - PAD.right
                  : PAD.left + (index + 0.5) * band;
            return (
              <text
                key={day.date}
                x={x}
                y={HEIGHT - 6}
                textAnchor={anchor}
                className="fill-muted-foreground text-[11px]"
              >
                {formatShortDay(day.date, locale)}
              </text>
            );
          })}
        </svg>
      )}
      {activeDay && active !== null && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md"
          style={{
            left: Math.min(
              Math.max(PAD.left + (active + 0.5) * band, 48),
              Math.max(48, width - 48),
            ),
          }}
        >
          <div className="text-muted-foreground">{formatShortDay(activeDay.date, locale)}</div>
          <div className="font-semibold tabular-nums">{groupDigits(activeDay[metric])}</div>
        </div>
      )}
    </div>
  );
}
