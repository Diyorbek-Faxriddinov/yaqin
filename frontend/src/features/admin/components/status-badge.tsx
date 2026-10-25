import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { BusinessStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const TONE: Record<BusinessStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success-soft text-success",
  hidden: "bg-warning-soft text-warning",
};

export function BusinessStatusBadge({
  status,
  className,
}: {
  status: BusinessStatus;
  className?: string;
}) {
  const t = useTranslations("Admin.status");
  return <Badge className={cn("border-transparent", TONE[status], className)}>{t(status)}</Badge>;
}
