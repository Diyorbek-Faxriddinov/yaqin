"use client";

import { useDeferredValue, useState } from "react";
import { Ban, MessageSquareWarning, Search, ShieldCheck, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminUser } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { USER_FILTERS, type UserFilter } from "../admin-params";
import { useCan } from "../use-admin";
import { useUpdateUser, useUserList } from "../use-moderation";
import { FilterChips, useUrlFilter } from "./filter-chips";
import { NoteDialog } from "./note-dialog";
import { PagedList } from "./paged-list";

const PROVIDERS: Record<AdminUser["provider"], string> = {
  telegram: "Telegram",
  google: "Google",
  demo: "Demo",
};

/** Mijozlar: faqat ism, kirish usuli va faollik (kontaktlar ko'rsatilmaydi); bloklash — user.manage */
export function UserList({ initialFilter }: { initialFilter: UserFilter }) {
  const t = useTranslations("Admin.users");
  const locale = useLocale();
  const canManage = useCan("user.manage");
  const [filter, setFilter] = useUrlFilter(initialFilter, "all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const list = useUserList(filter, deferredQuery);
  const update = useUpdateUser();
  const [blocking, setBlocking] = useState<AdminUser | null>(null);

  const unblock = (user: AdminUser) =>
    update.mutate(
      { id: user.id, isBlocked: false },
      {
        onSuccess: () => toast.success(t("unblockedToast", { name: user.displayName })),
        onError: () => toast.error(t("error")),
      },
    );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label={t("search")}
          placeholder={t("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <FilterChips
        label={t("filterLabel")}
        options={USER_FILTERS}
        value={filter}
        onChange={setFilter}
        getLabel={(value) => t(`filters.${value}`)}
      />

      <PagedList
        query={list}
        countLabel={(count) => t("count", { count })}
        emptyTitle={t("empty")}
        renderItem={(user) => (
          <article className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{user.displayName}</span>
                <Badge variant="outline">{PROVIDERS[user.provider]}</Badge>
                {user.isBlocked && (
                  <Badge className="border-transparent bg-destructive/10 text-destructive">
                    {t("blocked")}
                  </Badge>
                )}
              </p>
              <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span>{t("joined", { date: formatDate(user.createdAt, locale) })}</span>
                <span className="inline-flex items-center gap-1">
                  <Star aria-hidden="true" className="size-3" />
                  {t("reviews", { count: user.reviewsCount })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageSquareWarning aria-hidden="true" className="size-3" />
                  {t("complaints", { count: user.complaintsCount })}
                </span>
              </p>
              {user.blockedReason && (
                <p className="text-sm text-destructive">
                  {t("reason", { reason: user.blockedReason })}
                </p>
              )}
            </div>
            {canManage &&
              (user.isBlocked ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={update.isPending}
                  onClick={() => unblock(user)}
                >
                  <ShieldCheck aria-hidden="true" />
                  {t("unblock")}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setBlocking(user)}>
                  <Ban aria-hidden="true" />
                  {t("block")}
                </Button>
              ))}
          </article>
        )}
      />

      <NoteDialog
        open={blocking !== null}
        onOpenChange={(open) => !open && setBlocking(null)}
        title={t("blockTitle", { name: blocking?.displayName ?? "" })}
        description={t("blockDescription")}
        label={t("reasonLabel")}
        submitLabel={t("block")}
        presets={[t("presets.spam"), t("presets.offensive"), t("presets.fake")]}
        maxLength={200}
        destructive
        pending={update.isPending}
        onSubmit={(reason) =>
          blocking &&
          update.mutate(
            { id: blocking.id, isBlocked: true, reason },
            {
              onSuccess: () => {
                toast.success(t("blockedToast", { name: blocking.displayName }));
                setBlocking(null);
              },
              onError: () => toast.error(t("error")),
            },
          )
        }
      />
    </div>
  );
}
