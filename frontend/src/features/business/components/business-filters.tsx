"use client";

import { useState, useTransition } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { LocationChip, NearbyButton } from "@/features/location/components/nearby-button";
import { useRouter } from "@/i18n/navigation";
import type { BusinessSort } from "@/lib/api/types";
import { SORT_ORDER, withFilter, type BusinessFilters as Filters } from "../search-params";

type Option = { slug: string; name: string };

type Props = {
  filters: Filters;
  /** Sahifa yo'li: /qidiruv yoki /kategoriya/gozallik */
  basePath: string;
  districts: Option[];
  /** Faqat qidiruv sahifasida — kategoriya sahifasida kategoriya yo'lda */
  categories?: Option[];
  hasLocation: boolean;
};

// Radix Select bo'sh qiymatni qabul qilmaydi — "hammasi" uchun belgi
const ALL = "__all";

/** Filtr maydonlari: desktopda qatorda, telefonda pastdan ochiladigan oynada */
function FilterFields({
  filters,
  districts,
  categories,
  hasLocation,
  onChange,
  idPrefix,
}: Omit<Props, "basePath"> & { onChange: (patch: Partial<Filters>) => void; idPrefix: string }) {
  const t = useTranslations("Filters");

  return (
    <>
      {categories && (
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-category`}>{t("category")}</Label>
          <Select
            value={filters.category ?? ALL}
            onValueChange={(value) => onChange({ category: value === ALL ? null : value })}
          >
            <SelectTrigger id={`${idPrefix}-category`} className="w-full md:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allCategories")}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.slug} value={category.slug}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-district`}>{t("district")}</Label>
        <Select
          value={filters.district ?? ALL}
          onValueChange={(value) => onChange({ district: value === ALL ? null : value })}
        >
          <SelectTrigger id={`${idPrefix}-district`} className="w-full md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allDistricts")}</SelectItem>
            {districts.map((district) => (
              <SelectItem key={district.slug} value={district.slug}>
                {district.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-sort`}>{t("sort")}</Label>
        <Select
          value={filters.sort}
          onValueChange={(value) => onChange({ sort: value as BusinessSort })}
        >
          <SelectTrigger id={`${idPrefix}-sort`} className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_ORDER.map((sort) => {
              const disabled = sort === "distance" && !hasLocation;
              return (
                <SelectItem key={sort} value={sort} disabled={disabled}>
                  {t(`sortOptions.${sort}`)}
                  {disabled && (
                    <span className="text-muted-foreground"> — {t("distanceNeedsLocation")}</span>
                  )}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex h-10 items-center gap-2 md:self-end">
        <Switch
          id={`${idPrefix}-open-now`}
          checked={filters.openNow}
          onCheckedChange={(checked) => onChange({ openNow: checked })}
        />
        <Label htmlFor={`${idPrefix}-open-now`}>{t("openNow")}</Label>
      </div>
    </>
  );
}

export function BusinessFilters(props: Props) {
  const { filters, basePath, hasLocation } = props;
  const t = useTranslations("Filters");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);

  const navigate = (patch: Partial<Filters>) => {
    startTransition(() => {
      router.push(`${basePath}${withFilter(filters, patch)}`, { scroll: false });
    });
  };

  const activeCount =
    (filters.district ? 1 : 0) +
    (filters.openNow ? 1 : 0) +
    (props.categories && filters.category ? 1 : 0) +
    (filters.sort !== "recommended" ? 1 : 0);

  const nearbyHref = `${basePath}${withFilter(filters, { sort: "distance" })}`;
  const resetLocationHref = `${basePath}${withFilter(filters, {
    sort: filters.sort === "distance" ? "recommended" : filters.sort,
  })}`;

  const location = hasLocation ? (
    <LocationChip resetHref={resetLocationHref} />
  ) : (
    <NearbyButton href={nearbyHref} />
  );

  return (
    <div className="space-y-3">
      {/* Desktop: barcha filtrlar bitta qatorda */}
      <div className="hidden flex-wrap items-end gap-4 md:flex">
        <FilterFields {...props} onChange={navigate} idPrefix="filters" />
        <div className="ml-auto flex items-center gap-2">
          {pending && (
            <span
              role="status"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground"
            >
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              {t("updating")}
            </span>
          )}
          {location}
        </div>
      </div>

      {/* Telefon: "Filtrlar" tugmasi + joylashuv */}
      <div className="flex items-center gap-2 md:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1">
              <SlidersHorizontal aria-hidden="true" />
              {t("title")}
              {activeCount > 0 && (
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{t("title")}</SheetTitle>
              <SheetDescription className="sr-only">{t("title")}</SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4">
              <FilterFields {...props} onChange={navigate} idPrefix="filters-mobile" />
            </div>
            <SheetFooter>
              <Button size="lg" onClick={() => setSheetOpen(false)} disabled={pending}>
                {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
                {t("apply")}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <div className="shrink-0">{location}</div>
      </div>
    </div>
  );
}
