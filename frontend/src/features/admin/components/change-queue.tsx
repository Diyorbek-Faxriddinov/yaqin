"use client";

import { AlertTriangle, ChevronRight, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import type { AdminChangeListItem, ChangeKind, ChangeStatus } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import { CHANGE_FILTERS, type ChangeFilter } from "../admin-params";
import { useChangeQueue } from "../use-changes";
import { FilterChips, useUrlFilter } from "./filter-chips";
import { PagedList } from "./paged-list";

// Tarjima kalitlarida nuqta bo'lmaydi (next-intl) — "item.create" → "itemCreate"
export const KIND_KEY: Record<ChangeKind, string> = {
  profile: "profile",
  "item.create": "itemCreate",
  "item.update": "itemUpdate",
  "item.delete": "itemDelete",
  photos: "photos",
};

export const CHANGE_STATUS_TONE: Record<ChangeStatus, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
  superseded: "bg-muted text-muted-foreground",
};

/** Muhim maydon (nom, kategoriya, manzil...) va ziddiyat belgilari */
export function ChangeFlags({
  change,
}: {
  change: Pick<AdminChangeListItem, "important" | "conflict">;
}) {
  const t = useTranslations("Admin.changes");
  return (
    <>
      {change.important && (
        <Badge variant="outline" className="gap-1">
          <Star aria-hidden="true" className="size-3" />
          {t("important")}
        </Badge>
      )}
      {change.conflict && (
        <Badge className="gap-1 border-transparent bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-3" />
          {t("conflict")}
        </Badge>
      )}
    </>
  );
}

/** Egalar takliflari: navbat (eng eskisi birinchi) va tarix */
export function ChangeQueue({
  initialFilter,
  businessId,
}: {
  initialFilter: ChangeFilter;
  /** ?biznes= — faqat shu biznes takliflari (biznes sahifasidagi havoladan) */
  businessId: string | null;
}) {
  const t = useTranslations("Admin.changes");
  const tKinds = useTranslations("Cabinet.changes");
  const locale = useLocale();
  const [filter, setFilter] = useUrlFilter(initialFilter, "pending");
  const list = useChangeQueue(filter, businessId);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
        {businessId && (
          <Link
            href="/admin/takliflar"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            {t("allBusinesses")}
          </Link>
        )}
      </div>

      <FilterChips
        label={t("filterLabel")}
        options={CHANGE_FILTERS}
        value={filter}
        onChange={setFilter}
        getLabel={(value) => tKinds(`statuses.${value}`)}
      />

      <PagedList
        query={list}
        countLabel={(count) => t("count", { count })}
        emptyTitle={filter === "pending" ? t("emptyQueue") : t("empty")}
        renderItem={(change) => (
          <Link
            href={`/admin/takliflar/${change.id}`}
            className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold">{change.business.name}</p>
              <p className="text-sm">
                {tKinds(`kinds.${KIND_KEY[change.kind]}`)}
                {change.itemName && (
                  <span className="text-muted-foreground"> · {change.itemName}</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {change.author.displayName} ·{" "}
                <time dateTime={change.createdAt}>{formatDate(change.createdAt, locale)}</time>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {change.status !== "pending" && (
                  <Badge className={cn("border-transparent", CHANGE_STATUS_TONE[change.status])}>
                    {tKinds(`statuses.${change.status}`)}
                  </Badge>
                )}
                <ChangeFlags change={change} />
              </div>
            </div>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        )}
      />
    </div>
  );
}
