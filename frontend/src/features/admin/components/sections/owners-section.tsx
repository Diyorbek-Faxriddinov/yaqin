"use client";

import { useState } from "react";
import { Copy, Inbox, KeyRound, Loader2, Share2, TriangleAlert, UserMinus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { BrowserApiError } from "@/lib/api/browser";
import type { AdminBusiness } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { useCan } from "../../use-admin";
import {
  useBusinessOwners,
  useCreateOwnerInvite,
  usePendingChangesCount,
  useRemoveOwner,
  useRevokeOwnerInvite,
} from "../../use-changes";

/**
 * Biznes egalari (ADR-0015): ro'yxat, egalikni bekor qilish, bir martalik taklif havolasi.
 * Havola faqat yaratilganda bir marta ko'rsatiladi — backend tokenning xeshini saqlaydi.
 */
export function OwnersSection({ business }: { business: AdminBusiness }) {
  const t = useTranslations("Admin.owners");
  const tCommon = useTranslations("Profile");
  const locale = useLocale();
  const canManage = useCan("business.owners");
  const canReview = useCan("change.review");
  const { data, isPending } = useBusinessOwners(business.id);
  const pending = usePendingChangesCount(canReview, business.id);
  const create = useCreateOwnerInvite(business.id);
  const revoke = useRevokeOwnerInvite(business.id);
  const remove = useRemoveOwner(business.id);
  const [created, setCreated] = useState<{ url: string; qr: string } | null>(null);
  const url = created?.url ?? null;

  if (isPending || !data) return <Skeleton className="h-64" />;
  const full = data.owners.length >= data.maxOwners;

  const generate = () =>
    create.mutate(undefined, {
      onSuccess: (invite) => {
        setCreated({ url: invite.url, qr: invite.qrDataUri });
        toast.success(t("created"));
      },
      onError: (error) =>
        toast.error(
          error instanceof BrowserApiError && error.body?.code === "owner_limit"
            ? t("limit", { max: data.maxOwners })
            : t("error"),
        ),
    });

  const copy = () =>
    url &&
    void navigator.clipboard
      ?.writeText(url)
      .then(() => toast.success(t("copied")))
      .catch(() => toast.error(t("copyFailed")));

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      {canReview && pending !== undefined && pending > 0 && (
        <Link
          href={`/admin/takliflar?biznes=${business.id}`}
          className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning"
        >
          <Inbox aria-hidden="true" className="size-4" />
          {t("pendingChanges", { count: pending })}
        </Link>
      )}

      <section aria-labelledby="owners-title" className="space-y-3">
        <h3 id="owners-title" className="font-medium">
          {t("title", { count: data.owners.length, max: data.maxOwners })}
        </h3>
        {data.owners.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {data.owners.map((owner) => (
              <li key={owner.membershipId} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{owner.user.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`providers.${owner.provider}`)} ·{" "}
                    {t("since", { date: formatDate(owner.since, locale) })}
                    {owner.invitedBy && <> · {t("invitedBy", { name: owner.invitedBy })}</>}
                  </p>
                </div>
                {canManage && (
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${t("remove")}: ${owner.user.displayName}`}
                      >
                        <UserMinus aria-hidden="true" />
                      </Button>
                    }
                    title={t("removeConfirm", { name: owner.user.displayName })}
                    description={t("removeHint")}
                    confirmLabel={t("remove")}
                    cancelLabel={tCommon("cancel")}
                    pending={remove.isPending}
                    onConfirm={async () => {
                      try {
                        await remove.mutateAsync(owner.membershipId);
                        toast.success(t("removed"));
                      } catch {
                        toast.error(t("error"));
                      }
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="invite-title" className="space-y-3 rounded-xl border p-4">
        <div className="space-y-1">
          <h3 id="invite-title" className="flex items-center gap-2 font-medium">
            <KeyRound aria-hidden="true" className="size-4" />
            {t("inviteTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">{t("inviteDescription")}</p>
        </div>

        {data.invite && !url && (
          <p className="text-sm">
            {t("inviteActive", {
              date: formatDate(data.invite.expiresAt, locale),
              name: data.invite.createdBy ?? "—",
            })}
          </p>
        )}

        {url && (
          <div className="space-y-2 rounded-lg bg-muted p-3">
            <p className="flex items-start gap-2 text-sm">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              {t("onceWarning")}
            </p>
            {/* Do'konda: ega telefon kamerasi bilan skanerlaydi */}
            {/* eslint-disable-next-line @next/next/no-img-element -- data URI, optimallashtirilmaydi */}
            <img
              src={created?.qr}
              alt={t("qrAlt")}
              width={176}
              height={176}
              className="size-44 rounded-lg bg-white p-2"
            />
            <p className="font-mono text-xs break-all" data-testid="owner-invite-url">
              {url}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copy}>
                <Copy aria-hidden="true" />
                {t("copy")}
              </Button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void navigator
                      .share({ title: t("shareTitle", { name: business.name }), url })
                      .catch(() => undefined)
                  }
                >
                  <Share2 aria-hidden="true" />
                  {t("share")}
                </Button>
              )}
            </div>
          </div>
        )}

        {full && (
          <p className="text-sm text-muted-foreground">{t("limit", { max: data.maxOwners })}</p>
        )}

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={create.isPending || full} onClick={generate}>
              {create.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {data.invite || url ? t("regenerate") : t("create")}
            </Button>
            {(data.invite || url) && (
              <ConfirmDialog
                trigger={
                  <Button size="sm" variant="ghost">
                    {t("revoke")}
                  </Button>
                }
                title={t("revokeConfirm")}
                confirmLabel={t("revoke")}
                cancelLabel={tCommon("cancel")}
                pending={revoke.isPending}
                onConfirm={async () => {
                  try {
                    await revoke.mutateAsync();
                    setCreated(null);
                    toast.success(t("revoked"));
                  } catch {
                    toast.error(t("error"));
                  }
                }}
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
