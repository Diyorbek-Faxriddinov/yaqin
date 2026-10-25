"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AuditEntry, AuditTargetType } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { useAudit } from "../use-system";
import { FilterChips } from "./filter-chips";
import { PagedList } from "./paged-list";

const FILTERS = [
  "all",
  "business",
  "review",
  "complaint",
  "request",
  "category",
  "user",
  "admin",
  "role",
  "settings",
  "report",
  "auth",
] as const;
type Filter = (typeof FILTERS)[number];

/** Vaqt: "14:05" (Toshkent) — Intl'ning soat formati barcha tillarda bir xil */
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  }).format(new Date(iso));
}

/** Yozuv nishoniga havola (mavjud bo'lsa) */
function targetHref(entry: AuditEntry): string | null {
  if (entry.targetType === "business" || entry.targetType === "report") {
    return `/admin/bizneslar/${entry.targetId}`;
  }
  return null;
}

/** Audit jurnali — faqat o'qish; eng yangisi birinchi (ADR-0009, 7-qoida) */
export function AuditLog() {
  const t = useTranslations("Admin.audit");
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const list = useAudit(filter === "all" ? null : (filter as AuditTargetType));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <FilterChips
        label={t("filterLabel")}
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        getLabel={(value) => t(`targets.${value}`)}
      />

      <PagedList
        query={list}
        countLabel={(count) => t("count", { count })}
        emptyTitle={t("empty")}
        renderItem={(entry) => {
          const href = targetHref(entry);
          const actionKey = entry.action.replace(/\./g, "_");
          return (
            <article className="flex gap-3 rounded-xl border p-3">
              <time
                dateTime={entry.at}
                className="w-16 shrink-0 text-xs text-muted-foreground tabular-nums"
              >
                {formatTime(entry.at)}
                <span className="block">{formatDate(entry.at, locale).split(",")[0]}</span>
              </time>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm">
                  <span className="font-medium">{entry.admin?.displayName ?? t("system")}</span>{" "}
                  <span className="text-muted-foreground">
                    · {t.has(`actions.${actionKey}`) ? t(`actions.${actionKey}`) : entry.action}
                  </span>
                </p>
                <p className="text-sm break-words">
                  {href ? (
                    <Link href={href} className="underline-offset-4 hover:underline">
                      {entry.summary}
                    </Link>
                  ) : (
                    entry.summary
                  )}
                </p>
              </div>
            </article>
          );
        }}
      />
    </div>
  );
}
