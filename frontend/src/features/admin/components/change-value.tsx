"use client";

import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ItemPriceText } from "@/features/business/components/item-list";
import { WeeklyHours } from "@/features/business/components/weekly-hours";
import type { Amenity, ItemPrice, WeeklySchedule } from "@/lib/api/types";
import { formatPhone } from "@/lib/format/phone";
import { useCatalogOptions } from "../use-admin-business";

/**
 * Taklif solishtiruvidagi bitta qiymat. Qiymatlar admin API kirish shaklida (backend
 * `profile_values` / `item_values`), rasmlar — `{url, alt, new}` ro'yxati.
 */

type Photo = { url: string | null; alt?: string | null; new: boolean };
type Attribute = { key?: string | null; name: string; value: string };
type ItemValues = { name?: string; kind?: string; price?: ItemPrice };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function Empty() {
  const t = useTranslations("Admin.changes");
  return <span className="text-muted-foreground italic">{t("none")}</span>;
}

function Photos({ photos }: { photos: Photo[] }) {
  const t = useTranslations("Admin.changes");
  if (photos.length === 0) return <Empty />;
  return (
    <ul className="grid grid-cols-3 gap-2">
      {photos.map((photo, index) => (
        <li
          key={`${photo.url}-${index}`}
          className="relative aspect-square overflow-hidden rounded-lg border bg-muted"
        >
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- moderator ko'rinishi, tasdiqlanmagan rasm sessiya bilan
            <img src={photo.url} alt={photo.alt ?? ""} className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center p-1 text-center text-xs text-muted-foreground">
              {t("photoGone")}
            </span>
          )}
          <div className="absolute top-1 left-1 flex flex-wrap gap-1">
            {index === 0 && <Badge className="text-[10px]">{t("first")}</Badge>}
            {photo.new && (
              <Badge variant="secondary" className="text-[10px]">
                {t("newPhoto")}
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ChangeValue({ field, value }: { field: string; value: unknown }) {
  const t = useTranslations("Admin.changes");
  const tCatalog = useTranslations("Admin.catalog");
  const tAmenity = useTranslations("Amenities");
  const { categories, districts } = useCatalogOptions();

  if (value === null || value === undefined || value === "") return <Empty />;

  switch (field) {
    case "categorySlug": {
      const child = categories.flatMap((root) => root.children).find((c) => c.slug === value);
      return <span>{child?.name ?? String(value)}</span>;
    }
    case "districtSlug":
      return <span>{districts.find((d) => d.slug === value)?.name ?? String(value)}</span>;
    case "address": {
      const address = isRecord(value) ? value : {};
      return (
        <span>
          {String(address.text ?? "") || <Empty />}
          {address.landmark ? (
            <span className="block text-muted-foreground">{String(address.landmark)}</span>
          ) : null}
        </span>
      );
    }
    case "location": {
      const point = isRecord(value) ? value : {};
      const lat = Number(point.lat);
      const lng = Number(point.lng);
      return (
        <a
          href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
        >
          {lat.toFixed(5)}, {lng.toFixed(5)}
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only">{t("openMap")}</span>
        </a>
      );
    }
    case "phones": {
      const phones = Array.isArray(value) ? (value as Array<{ number: string }>) : [];
      if (phones.length === 0) return <Empty />;
      return (
        <ul>
          {phones.map((phone) => (
            <li key={phone.number}>{formatPhone(phone.number)}</li>
          ))}
        </ul>
      );
    }
    case "amenities": {
      const amenities = Array.isArray(value) ? (value as Amenity[]) : [];
      if (amenities.length === 0) return <Empty />;
      return <span>{amenities.map((a) => tAmenity(a)).join(", ")}</span>;
    }
    case "schedule":
      return <WeeklyHours schedule={value as WeeklySchedule} />;
    case "photos":
      return <Photos photos={Array.isArray(value) ? (value as Photo[]) : []} />;
    case "item.price":
      return <ItemPriceText price={value as ItemPrice} />;
    case "item.kind":
      return <span>{value === "service" ? tCatalog("service") : tCatalog("product")}</span>;
    case "item.isAvailable":
      return <span>{value ? t("yes") : t("no")}</span>;
    case "item.durationMinutes":
      return <span>{t("minutes", { count: Number(value) })}</span>;
    case "item.attributes": {
      const attributes = Array.isArray(value) ? (value as Attribute[]) : [];
      if (attributes.length === 0) return <Empty />;
      return (
        <ul>
          {attributes.map((a) => (
            <li key={`${a.key ?? a.name}`}>
              <span className="text-muted-foreground">{a.name}:</span> {a.value}
            </li>
          ))}
        </ul>
      );
    }
    case "item": {
      // O'chirish taklifi — butun mahsulot
      const item = (isRecord(value) ? value : {}) as ItemValues;
      return (
        <span className="space-y-1">
          <span className="block font-medium">{item.name}</span>
          {item.price && <ItemPriceText price={item.price} className="text-sm" />}
        </span>
      );
    }
    default:
      return typeof value === "string" || typeof value === "number" ? (
        <span className="break-words whitespace-pre-line">{String(value)}</span>
      ) : (
        <code className="text-xs break-all">{JSON.stringify(value)}</code>
      );
  }
}
