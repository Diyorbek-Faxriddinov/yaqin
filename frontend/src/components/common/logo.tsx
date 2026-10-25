import { cn } from "@/lib/utils";

/** Belgi: firuza fonda xarita pini — "yaqin atrofda" g'oyasi */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M16 6.5c-4.28 0-7.75 3.3-7.75 7.47 0 5.4 6.62 10.93 7.2 11.4a.86.86 0 0 0 1.1 0c.58-.47 7.2-6 7.2-11.4 0-4.17-3.47-7.47-7.75-7.47Z"
        fill="#fff"
      />
      <circle cx="16" cy="14" r="3" fill="var(--primary)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-xl font-bold tracking-tight text-foreground">Yaqin</span>
    </span>
  );
}
