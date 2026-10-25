"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Tanlangan filtr — holatda va URL'da (?filtr=): sahifa yangilansa yoki havola ulashilsa saqlanadi.
 * Standart qiymat URL'ga yozilmaydi.
 */
export function useUrlFilter<T extends string>(initial: T, defaultValue: T) {
  const [value, setValue] = useState<T>(initial);
  const update = (next: T) => {
    setValue(next);
    const url = new URL(window.location.href);
    if (next === defaultValue) url.searchParams.delete("filtr");
    else url.searchParams.set("filtr", next);
    window.history.replaceState(null, "", url);
  };
  return [value, update] as const;
}

/** Holat bo'yicha filtr tugmalari (telefonda gorizontal suriladi) */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
  getLabel,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  getLabel: (value: T) => string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            value === option
              ? "border-primary bg-primary text-primary-foreground"
              : "hover:bg-muted",
          )}
        >
          {getLabel(option)}
        </button>
      ))}
    </div>
  );
}
