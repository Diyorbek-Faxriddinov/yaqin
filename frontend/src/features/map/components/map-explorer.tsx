"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { ArrowRight, List, Loader2, Map as MapIcon, Star, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { BusinessOpenStatus } from "@/features/business/components/business-open-status";
import { filtersToQuery } from "@/features/business/search-params";
import { CategoryIcon } from "@/features/category/category-icon";
import { getPathname, Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { MapMarker } from "@/lib/api/types";
import { formatDecimal } from "@/lib/format/number";
import { cn } from "@/lib/utils";
import { MapView } from "./lazy-map";

type Props = {
  markers: MapMarker[];
  category: string | null;
  openNow: boolean;
  categories: Array<{ slug: string; name: string }>;
  initialSelected: string | null;
  locale: AppLocale;
};

const ALL = "__all";

function mapQuery(category: string | null, openNow: boolean, selected: string | null): string {
  const query = filtersToQuery({ category, openNow });
  if (!selected) return query;
  return `${query ? `${query}&` : "?"}b=${encodeURIComponent(selected)}`;
}

/** Tanlangan biznes haqida qisqa karta */
function SelectedCard({ marker, onClose }: { marker: MapMarker; onClose: () => void }) {
  const t = useTranslations("MapPage");
  const tCommon = useTranslations("Common");

  return (
    <div className="relative rounded-xl border bg-card p-4 shadow-lg">
      <button
        type="button"
        onClick={onClose}
        aria-label={tCommon("close")}
        className="absolute top-2 right-2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
      <div className="flex gap-3 pr-8">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
          <CategoryIcon iconKey={marker.category.iconKey} className="size-6" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="truncate font-semibold">{marker.name}</p>
          <p className="truncate text-sm text-muted-foreground">{marker.category.name}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {marker.rating.average != null && (
              <span className="inline-flex items-center gap-1">
                <Star aria-hidden="true" className="size-4 fill-highlight text-highlight" />
                {formatDecimal(marker.rating.average)}
              </span>
            )}
            <BusinessOpenStatus schedule={marker.schedule} />
          </div>
        </div>
      </div>
      <Button asChild className="mt-3 w-full">
        <Link href={`/biznes/${marker.slug}`}>
          {t("details")}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

export function MapExplorer({
  markers,
  category,
  openNow,
  categories,
  initialSelected,
  locale,
}: Props) {
  const t = useTranslations("MapPage");
  const tFilters = useTranslations("Filters");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(
    markers.some((m) => m.slug === initialSelected) ? initialSelected : null,
  );
  const [mobileView, setMobileView] = useState<"map" | "list">("map");

  const points = useMemo(
    () =>
      markers.map((m) => ({
        slug: m.slug,
        name: m.name,
        lat: m.location.lat,
        lng: m.location.lng,
      })),
    [markers],
  );
  const selectedMarker = markers.find((m) => m.slug === selected) ?? null;

  // Tanlov URL'da (ulashish uchun), lekin server so'rovisiz — faqat tarix yozuvi almashtiriladi
  const select = useCallback(
    (slug: string | null) => {
      setSelected(slug);
      const path = getPathname({ href: "/xarita", locale });
      window.history.replaceState(null, "", `${path}${mapQuery(category, openNow, slug)}`);
    },
    [category, openNow, locale],
  );

  const applyFilters = (next: { category?: string | null; openNow?: boolean }) => {
    startTransition(() => {
      router.push(
        `/xarita${mapQuery(next.category !== undefined ? next.category : category, next.openNow ?? openNow, null)}`,
        { scroll: false },
      );
    });
  };

  const filters = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid min-w-44 flex-1 gap-1.5">
        <Label htmlFor="map-category">{tFilters("category")}</Label>
        <Select
          value={category ?? ALL}
          onValueChange={(value) => applyFilters({ category: value === ALL ? null : value })}
        >
          <SelectTrigger id="map-category" className="w-full bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{tFilters("allCategories")}</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex h-10 items-center gap-2">
        <Switch
          id="map-open-now"
          checked={openNow}
          onCheckedChange={(checked) => applyFilters({ openNow: checked })}
        />
        <Label htmlFor="map-open-now">{tFilters("openNow")}</Label>
      </div>
      {pending && (
        <Loader2 aria-label={tFilters("updating")} className="mb-2.5 size-4 animate-spin" />
      )}
    </div>
  );

  const list = (
    <ul className="divide-y">
      {markers.map((marker) => (
        <li key={marker.id}>
          <button
            type="button"
            onClick={() => {
              select(marker.slug);
              setMobileView("map");
            }}
            aria-pressed={marker.slug === selected}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
              marker.slug === selected && "bg-primary-soft",
            )}
          >
            <CategoryIcon
              iconKey={marker.category.iconKey}
              className="size-5 shrink-0 text-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{marker.name}</span>
              <span className="block truncate text-sm text-muted-foreground">
                {marker.category.name}
              </span>
            </span>
            {marker.rating.average != null && (
              <span className="inline-flex items-center gap-1 text-sm">
                <Star aria-hidden="true" className="size-3.5 fill-highlight text-highlight" />
                {formatDecimal(marker.rating.average)}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex h-[calc(100dvh-4rem-var(--bottom-nav-height))] min-h-[28rem] flex-col md:h-[calc(100dvh-4rem)] md:flex-row">
      {/* Desktop: chap panel */}
      <aside className="hidden w-96 shrink-0 flex-col border-r md:flex">
        <div className="space-y-3 border-b p-4">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          {filters}
          <p role="status" className="text-sm text-muted-foreground">
            {t("count", { count: markers.length })}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">{list}</div>
      </aside>

      {/* Telefon: filtrlar va xarita/ro'yxat almashtirgichi */}
      <div className="space-y-3 border-b p-3 md:hidden">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileView(mobileView === "map" ? "list" : "map")}
          >
            {mobileView === "map" ? <List aria-hidden="true" /> : <MapIcon aria-hidden="true" />}
            {mobileView === "map" ? t("showList") : t("showMap")}
          </Button>
        </div>
        {filters}
      </div>

      <div className="relative min-h-0 flex-1">
        <MapView
          points={points}
          selectedSlug={selected}
          onSelect={select}
          showGeolocate
          label={t("mapLabel")}
          className={cn("absolute inset-0", mobileView === "list" && "max-md:invisible")}
        />
        {mobileView === "list" && (
          <div className="absolute inset-0 overflow-y-auto bg-background md:hidden">
            <p role="status" className="px-4 pt-3 text-sm text-muted-foreground">
              {t("count", { count: markers.length })}
            </p>
            {list}
          </div>
        )}
        {selectedMarker && mobileView === "map" && (
          // Xaritaning tepasida (telefonda pastki menyu ostida qolmasin), o'ngda tugmalar uchun joy
          <div className="absolute top-3 right-14 left-3 md:right-auto md:w-80">
            <SelectedCard marker={selectedMarker} onClose={() => select(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
