"use client";

import { useDeferredValue, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Camera, ChevronRight, ListOrdered, Plus, Search, ShieldAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { RetryButton } from "@/components/common/retry-button";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryIcon } from "@/features/category/category-icon";
import { Link } from "@/i18n/navigation";
import { browserApi, call } from "@/lib/api/browser";
import type { ListFilter } from "../admin-params";
import { useCan } from "../use-admin";
import { FilterChips } from "./filter-chips";
import { BusinessStatusBadge } from "./status-badge";

const FILTERS: ListFilter[] = ["all", "draft", "published", "hidden", "noConsent"];
const PAGE_SIZE = 20;

export function AdminBusinessList({ initialFilter }: { initialFilter: ListFilter }) {
  const t = useTranslations("Admin.list");
  const tStates = useTranslations("States");
  const lang = useLocale() as "uz" | "ru";
  const canEdit = useCan("business.edit");
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const list = useInfiniteQuery({
    queryKey: ["admin", "businesses", "list", lang, filter, deferredQuery],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      call(
        browserApi.GET("/admin/businesses", {
          params: {
            query: {
              lang,
              page: pageParam,
              pageSize: PAGE_SIZE,
              q: deferredQuery || undefined,
              ...(filter === "noConsent"
                ? { missingConsent: true }
                : filter === "all"
                  ? {}
                  : { status: filter }),
            },
          },
        }),
      ),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.total;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        {canEdit && (
          <Button asChild className="hidden lg:inline-flex">
            <Link href="/admin/bizneslar/yangi">
              <Plus aria-hidden="true" />
              {t("title")}
            </Link>
          </Button>
        )}
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
        label={t("filters.label")}
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        getLabel={(value) => t(`filters.${value}`)}
      />

      {total !== undefined && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("count", { count: total })}
        </p>
      )}

      {list.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : list.isError ? (
        <ErrorState
          title={tStates("errorTitle")}
          description={tStates("errorDescription")}
          action={<RetryButton onRetry={() => void list.refetch()} />}
        />
      ) : items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((business) => (
            <li key={business.id}>
              <Link
                href={`/admin/bizneslar/${business.id}`}
                className="flex items-center gap-3 p-3 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                  <CategoryIcon iconKey={business.category.iconKey} className="size-5" />
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{business.name}</span>
                    <BusinessStatusBadge status={business.status} />
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      {business.category.name} · {business.district.name}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Camera aria-hidden="true" className="size-3" />
                      {t("photos", { count: business.photosCount })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ListOrdered aria-hidden="true" className="size-3" />
                      {t("items", { count: business.itemsCount })}
                    </span>
                    {!business.hasConsent && (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <ShieldAlert aria-hidden="true" className="size-3" />
                        {t("noConsent")}
                      </span>
                    )}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {list.hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {t("loadMore")}
        </Button>
      )}
    </div>
  );
}
