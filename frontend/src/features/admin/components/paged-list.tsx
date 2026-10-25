"use client";

import { useTranslations } from "next-intl";
import { RetryButton } from "@/components/common/retry-button";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type PagedQuery<T> = {
  items: T[];
  total: number | undefined;
  isPending: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  refetch: () => unknown;
  fetchNextPage: () => unknown;
};

/** Admin ro'yxatlari uchun umumiy holatlar: yuklanmoqda, xato, bo'sh, "Yana ko'rsatish" */
export function PagedList<T extends { id: string }>({
  query,
  countLabel,
  emptyTitle,
  emptyDescription,
  renderItem,
}: {
  query: PagedQuery<T>;
  countLabel: (count: number) => string;
  emptyTitle: string;
  emptyDescription?: string;
  renderItem: (item: T) => React.ReactNode;
}) {
  const t = useTranslations("Admin.list");
  const tStates = useTranslations("States");

  return (
    <div className="space-y-4">
      {query.total !== undefined && (
        <p role="status" className="text-sm text-muted-foreground">
          {countLabel(query.total)}
        </p>
      )}

      {query.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState
          title={tStates("errorTitle")}
          description={tStates("errorDescription")}
          action={<RetryButton onRetry={() => void query.refetch()} />}
        />
      ) : query.items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="space-y-3">
          {query.items.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("loadMore")}
        </Button>
      )}
    </div>
  );
}
