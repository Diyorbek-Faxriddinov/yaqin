import { SearchX, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Masalan: "Qayta urinish" tugmasi yoki boshqa sahifaga havola */
  action?: React.ReactNode;
  className?: string;
  /** Sahifaning asosiy mazmuni bo'lsa (masalan, 404) — "h1" */
  headingLevel?: "h1" | "h2" | "h3";
};

function StateBlock({
  title,
  description,
  icon: Icon,
  action,
  className,
  headingLevel: Heading = "h2",
  tone,
  role,
}: StateProps & { tone: "neutral" | "error"; role?: "alert" }) {
  return (
    <div
      role={role}
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && (
        <span
          className={cn(
            "mb-4 inline-flex size-12 items-center justify-center rounded-full",
            tone === "error"
              ? "bg-destructive/10 text-destructive"
              : "bg-muted text-muted-foreground",
          )}
        >
          <Icon aria-hidden="true" className="size-6" />
        </span>
      )}
      <Heading className="text-lg font-semibold">{title}</Heading>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Natija bo'sh bo'lganda: qidiruv, filtr, sevimlilar ro'yxati */
export function EmptyState({ icon = SearchX, ...props }: StateProps) {
  return <StateBlock icon={icon} tone="neutral" {...props} />;
}

/** Maʼlumot yuklanmaganda. Ekran o'quvchilar darhol eshitishi uchun role="alert". */
export function ErrorState({ icon = TriangleAlert, ...props }: StateProps) {
  return <StateBlock icon={icon} tone="error" role="alert" {...props} />;
}
