"use client";

import { Inbox } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminItem, ChangeKind, ChangeStatus, OwnerChange } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { useOwnChanges, useWithdrawChange } from "../use-cabinet";

// Tarjima kalitlarida nuqta bo'lmaydi (next-intl) — "item.create" → "itemCreate"
const KIND_KEY: Record<ChangeKind, string> = {
  profile: "profile",
  "item.create": "itemCreate",
  "item.update": "itemUpdate",
  "item.delete": "itemDelete",
  photos: "photos",
};

const STATUS_TONE: Record<ChangeStatus, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
  superseded: "bg-muted text-muted-foreground",
};

function ChangeCard({
  change,
  businessId,
  items,
}: {
  change: OwnerChange;
  businessId: string;
  items: AdminItem[];
}) {
  const t = useTranslations("Cabinet.changes");
  const tProfile = useTranslations("Profile");
  const locale = useLocale();
  const withdraw = useWithdrawChange(businessId);
  const itemName = change.itemId
    ? (items.find((item) => item.id === change.itemId)?.name ?? t("removedItem"))
    : null;
  // O'chirish taklifida maydonlar ro'yxati yo'q (butun mahsulot)
  const fields =
    change.kind === "item.delete"
      ? []
      : change.fields.map((field) => (t.has(`fields.${field}`) ? t(`fields.${field}`) : field));

  return (
    <li className="space-y-2 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          {t(`kinds.${KIND_KEY[change.kind]}`)}
          {itemName && <span className="text-muted-foreground"> · {itemName}</span>}
        </p>
        <Badge className={cn("border-transparent", STATUS_TONE[change.status])}>
          {t(`statuses.${change.status}`)}
        </Badge>
      </div>
      {fields.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t("changed", { fields: [...new Set(fields)].join(", ") })}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {t("sentAt", { date: formatDate(change.createdAt, locale) })}
        {change.reviewedAt && (
          <> · {t("reviewedAt", { date: formatDate(change.reviewedAt, locale) })}</>
        )}
      </p>
      {change.status === "rejected" && change.rejectionReason && (
        <p className="rounded-lg bg-destructive/5 p-3 text-sm">
          {t("reason", { reason: change.rejectionReason })}
        </p>
      )}
      {change.status === "pending" && (
        <ConfirmDialog
          trigger={
            <Button variant="ghost" size="sm" className="-ml-2">
              {t("withdraw")}
            </Button>
          }
          title={t("withdrawConfirm")}
          description={t("withdrawHint")}
          confirmLabel={t("withdraw")}
          cancelLabel={tProfile("cancel")}
          pending={withdraw.isPending}
          onConfirm={async () => {
            try {
              await withdraw.mutateAsync(change.id);
              toast.success(t("withdrawn"));
            } catch {
              toast.error(t("withdrawError"));
            }
          }}
        />
      )}
    </li>
  );
}

/** "Takliflarim": holati, rad etish sababi, kutilayotganini qaytarib olish */
export function OwnChanges({ businessId, items }: { businessId: string; items: AdminItem[] }) {
  const t = useTranslations("Cabinet.changes");
  const tStates = useTranslations("States");
  const { data, isPending, isError } = useOwnChanges(businessId);

  if (isPending) return <Skeleton className="h-40" />;
  if (isError) {
    return <ErrorState title={tStates("errorTitle")} description={tStates("errorDescription")} />;
  }
  if (data.length === 0) {
    return <EmptyState icon={Inbox} title={t("empty")} description={t("emptyHint")} />;
  }
  return (
    <ul className="space-y-3">
      {data.map((change) => (
        <ChangeCard key={change.id} change={change} businessId={businessId} items={items} />
      ))}
    </ul>
  );
}
