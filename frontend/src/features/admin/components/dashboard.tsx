"use client";

import { useQuery } from "@tanstack/react-query";
import { Inbox, MessageSquareWarning, Plus, Star, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { browserApi, call } from "@/lib/api/browser";
import type { BusinessStatus } from "@/lib/api/types";
import { useAdminMe, useCan } from "../use-admin";
import { useQueueCount } from "../use-moderation";

type StatKey = BusinessStatus | "noConsent";

function useCount(key: StatKey) {
  return useQuery({
    queryKey: ["admin", "businesses", "count", key],
    queryFn: async () => {
      const page = await call(
        browserApi.GET("/admin/businesses", {
          params: {
            query: {
              pageSize: 1,
              ...(key === "noConsent" ? { missingConsent: true } : { status: key }),
            },
          },
        }),
      );
      return page.total;
    },
  });
}

function StatCard({ statKey }: { statKey: StatKey }) {
  const t = useTranslations("Admin");
  const { data } = useCount(statKey);
  const href =
    statKey === "noConsent"
      ? "/admin/bizneslar?filtr=rozilik"
      : `/admin/bizneslar?filtr=${statKey}`;

  return (
    <Link
      href={href}
      className="rounded-xl border p-4 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <p className="text-sm text-muted-foreground">{t(`dashboard.stats.${statKey}`)}</p>
      {data === undefined ? (
        <Skeleton className="mt-2 h-8 w-12" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tabular-nums">{data}</p>
      )}
    </Link>
  );
}

type QueueKey = "requests" | "reviews" | "complaints";

const QUEUES: Array<{ key: QueueKey; href: string; icon: LucideIcon }> = [
  { key: "requests", href: "/admin/sorovlar", icon: Inbox },
  { key: "reviews", href: "/admin/sharhlar", icon: Star },
  { key: "complaints", href: "/admin/shikoyatlar", icon: MessageSquareWarning },
];

/** Navbatdagi ishlar soni; 0 bo'lmasa ajratib ko'rsatiladi */
function QueueCard({
  queueKey,
  href,
  icon: Icon,
}: {
  queueKey: QueueKey;
  href: string;
  icon: LucideIcon;
}) {
  const t = useTranslations("Admin.dashboard.queues");
  const count = useQueueCount(queueKey, true);
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span
        className={
          count
            ? "inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning-soft text-warning"
            : "inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        }
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1 text-sm">{t(queueKey)}</span>
      {count === undefined ? (
        <Skeleton className="h-7 w-8" />
      ) : (
        <span className="text-2xl font-semibold tabular-nums">{count}</span>
      )}
    </Link>
  );
}

export function AdminDashboard() {
  const t = useTranslations("Admin.dashboard");
  const { data: admin } = useAdminMe();
  const canEdit = useCan("business.edit");
  const canView = useCan("business.view");
  const allowed: Record<QueueKey, boolean> = {
    requests: canEdit,
    reviews: useCan("review.moderate"),
    complaints: useCan("complaint.manage"),
  };
  const queues = QUEUES.filter((queue) => allowed[queue.key]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        {admin && (
          <p className="text-muted-foreground">{t("greeting", { name: admin.displayName })}</p>
        )}
      </div>

      {canEdit && (
        <Link
          href="/admin/bizneslar/yangi"
          className="flex items-center gap-4 rounded-2xl bg-primary p-5 text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15">
            <Plus aria-hidden="true" className="size-6" />
          </span>
          <span>
            <span className="block text-lg font-semibold">{t("quickAdd")}</span>
            <span className="block text-sm text-primary-foreground/90">{t("quickAddHint")}</span>
          </span>
        </Link>
      )}

      {queues.length > 0 && (
        <section aria-labelledby="dashboard-queues" className="space-y-3">
          <h2 id="dashboard-queues" className="text-lg font-semibold">
            {t("queues.title")}
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {queues.map((queue) => (
              <QueueCard key={queue.key} queueKey={queue.key} href={queue.href} icon={queue.icon} />
            ))}
          </div>
        </section>
      )}

      {canView && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["published", "draft", "hidden", "noConsent"] as const).map((key) => (
            <StatCard key={key} statKey={key} />
          ))}
        </div>
      )}

      {!canEdit && canView && (
        <Button asChild variant="outline">
          <Link href="/admin/bizneslar">{t("title")}</Link>
        </Button>
      )}
    </div>
  );
}
