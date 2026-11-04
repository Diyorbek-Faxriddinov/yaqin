"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { RetryButton } from "@/components/common/retry-button";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { BrowserApiError } from "@/lib/api/browser";
import type { AdminChange, ChangeField } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { useApproveChange, useChange, useRejectChange } from "../use-changes";
import { CHANGE_STATUS_TONE, ChangeFlags, KIND_KEY } from "./change-queue";
import { ChangeValue } from "./change-value";
import { NoteDialog } from "./note-dialog";

type Column = "before" | "current" | "after";

/**
 * Ko'rsatiladigan ustunlar: yangi mahsulot — faqat taklif; ziddiyat bo'lsa — oldin / hozir /
 * taklif (taklifdan keyin kimdir o'zgartirgan); aks holda — hozir / taklif.
 */
function columnsFor(change: AdminChange, field: ChangeField): Column[] {
  if (change.kind === "item.create") return ["after"];
  if (change.kind === "item.delete") return ["current"];
  return field.conflict ? ["before", "current", "after"] : ["current", "after"];
}

function FieldRow({ change, field }: { change: AdminChange; field: ChangeField }) {
  const t = useTranslations("Admin.changes");
  const tFields = useTranslations("Cabinet.changes.fields");
  const columns = columnsFor(change, field);
  const label =
    field.field === "item"
      ? t("wholeItem")
      : tFields.has(field.field)
        ? tFields(field.field)
        : field.field;

  return (
    <section
      aria-label={label}
      className={cn("space-y-3 rounded-xl border p-4", field.conflict && "border-destructive/40")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">{label}</h2>
        <ChangeFlags change={field} />
      </div>
      <dl
        className={cn(
          "grid gap-3",
          columns.length === 3 ? "sm:grid-cols-3" : columns.length === 2 && "sm:grid-cols-2",
        )}
      >
        {columns.map((column) => (
          <div
            key={column}
            className={cn(
              "space-y-1 rounded-lg p-3 text-sm",
              column === "after" ? "bg-primary/5 ring-1 ring-primary/20" : "bg-muted/50",
            )}
          >
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t(`columns.${column}`)}
            </dt>
            <dd>
              <ChangeValue field={field.field} value={field[column]} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Tasdiqlash xatosi: qayta tekshiruv (400), allaqachon ko'rilgan yoki mahsulot o'chgan (409) */
function approveErrorKey(error: unknown): "notPending" | "targetMissing" | "invalid" | "error" {
  if (!(error instanceof BrowserApiError)) return "error";
  if (error.status === 409)
    return error.body?.code === "target_missing" ? "targetMissing" : "notPending";
  if (error.status === 400) return "invalid";
  return "error";
}

export function ChangeReview({ id }: { id: string }) {
  const t = useTranslations("Admin.changes");
  const tKinds = useTranslations("Cabinet.changes");
  const tStates = useTranslations("States");
  const locale = useLocale();
  const router = useRouter();
  const { data: change, isPending, isError, refetch } = useChange(id);
  const approve = useApproveChange();
  const reject = useRejectChange();
  const [rejecting, setRejecting] = useState(false);

  if (isPending) return <Skeleton className="mx-auto h-96 max-w-3xl" />;
  if (isError || !change) {
    return (
      <ErrorState
        title={tStates("errorTitle")}
        description={tStates("errorDescription")}
        action={<RetryButton onRetry={() => void refetch()} />}
      />
    );
  }

  const done = (message: string) => {
    toast.success(message);
    router.push("/admin/takliflar");
  };

  const onApprove = () =>
    approve.mutate(change.id, {
      onSuccess: () => done(t("approvedToast")),
      onError: (error) => {
        const key = approveErrorKey(error);
        const details =
          error instanceof BrowserApiError && error.body?.fields
            ? Object.values(error.body.fields).flat().join("; ")
            : "";
        toast.error(details ? `${t(`errors.${key}`)} ${details}` : t(`errors.${key}`));
        void refetch();
      },
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/takliflar">
            <ArrowLeft aria-hidden="true" />
            {t("back")}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{tKinds(`kinds.${KIND_KEY[change.kind]}`)}</h1>
          <Badge className={cn("border-transparent", CHANGE_STATUS_TONE[change.status])}>
            {tKinds(`statuses.${change.status}`)}
          </Badge>
        </div>
        <p className="text-sm">
          <Link
            href={`/admin/bizneslar/${change.business.id}`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {change.business.name}
          </Link>
          {change.itemName && <span className="text-muted-foreground"> · {change.itemName}</span>}
        </p>
        <p className="text-sm text-muted-foreground">
          {t("author", { name: change.author.displayName })} ·{" "}
          <time dateTime={change.createdAt}>{formatDate(change.createdAt, locale)}</time>
        </p>
        {change.reviewedAt && (
          <p className="text-sm text-muted-foreground">
            {t("reviewed", {
              name: change.reviewedBy ?? "—",
              date: formatDate(change.reviewedAt, locale),
            })}
          </p>
        )}
        {change.rejectionReason && (
          <p className="text-sm text-destructive">
            {tKinds("reason", { reason: change.rejectionReason })}
          </p>
        )}
        {change.status === "pending" && change.conflict && (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertDescription>{t("conflictHint")}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="space-y-3">
        {change.fields.map((field) => (
          <FieldRow key={field.field} change={change} field={field} />
        ))}
      </div>

      {change.status === "pending" && (
        <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
          <Button size="lg" disabled={approve.isPending} onClick={onApprove}>
            {approve.isPending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {t("approve")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => setRejecting(true)}>
            <X aria-hidden="true" />
            {t("reject")}
          </Button>
        </div>
      )}

      <NoteDialog
        open={rejecting}
        onOpenChange={setRejecting}
        title={t("rejectTitle")}
        description={t("rejectDescription")}
        label={t("reasonLabel")}
        submitLabel={t("reject")}
        presets={[t("presets.wrong"), t("presets.photos"), t("presets.unrelated")]}
        maxLength={200}
        destructive
        pending={reject.isPending}
        onSubmit={(reason) =>
          reject.mutate(
            { id: change.id, reason },
            {
              onSuccess: () => {
                setRejecting(false);
                done(t("rejectedToast"));
              },
              onError: (error) => {
                toast.error(t(`errors.${approveErrorKey(error)}`));
                void refetch();
              },
            },
          )
        }
      />
    </div>
  );
}
