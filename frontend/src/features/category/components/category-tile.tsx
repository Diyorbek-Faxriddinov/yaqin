import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "../category-icon";

export function CategoryTile({
  href,
  name,
  iconKey,
  className,
}: {
  href: string;
  name: string;
  iconKey: string | null;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <CategoryIcon iconKey={iconKey} className="size-6" />
      </span>
      <span className="text-sm leading-tight font-medium">{name}</span>
    </Link>
  );
}
