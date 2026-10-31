"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { defaultKind } from "@/features/business/catalog";
import { ItemPriceText } from "@/features/business/components/item-list";
import { browserApi, call } from "@/lib/api/browser";
import type { AdminItem, AttributeDefinition, ItemInput } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import {
  adminItemsKey,
  applyServerErrors,
  useAdminItems,
  useDeleteItem,
  useSaveItem,
} from "../../use-admin-business";
import { PhotoManager, uploadPhoto } from "../photo-manager";
import type { SectionProps } from "./section-props";

const PRICE_TYPES = ["fixed", "from", "range", "on_request"] as const;
const MAX_ITEM_PHOTOS = 5;
const MAX_ATTRIBUTES = 20;
// Radix Select bo'sh qiymatni qabul qilmaydi — "tanlanmagan" belgisi
const NONE = "__none";
const toSom = (amount?: number | null) => (amount != null ? String(Math.round(amount / 100)) : "");
const toTiyin = (som: number) => ({ amount: Math.round(som * 100), currency: "UZS" as const });

/** Kategoriya xususiyatlari (admin belgilaydi) — mahsulot formasida turiga mos maydon sifatida */
function useCategoryAttributes(slug: string, enabled: boolean): AttributeDefinition[] {
  const lang = useLocale() as "uz" | "ru";
  const { data } = useQuery({
    queryKey: ["categories", "detail", slug, lang],
    queryFn: () =>
      call(browserApi.GET("/categories/{slug}", { params: { path: { slug }, query: { lang } } })),
    enabled,
    staleTime: 10 * 60_000,
  });
  return data?.attributes ?? [];
}

/** Tugmalar guruhi: bosilgan holat aria-pressed bilan */
function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-w-10 rounded-lg border px-3 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        pressed
          ? "border-primary bg-primary-soft font-medium text-primary-soft-foreground"
          : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** Kategoriya xususiyati: qiymat — xom ko'rinishda (variant qiymatlari, son, "true"/"false") */
function AttributeField({
  definition,
  value,
  onChange,
}: {
  definition: AttributeDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("Admin.catalog");
  const id = `attribute-${definition.key}`;
  const options = definition.options ?? [];

  if (definition.type === "multiselect" || definition.type === "boolean") {
    const choices =
      definition.type === "boolean"
        ? [
            { value: "true", label: t("yes") },
            { value: "false", label: t("no") },
          ]
        : options;
    const selected = new Set(value ? value.split(",") : []);
    const toggle = (choice: string) => {
      if (definition.type === "boolean") return onChange(value === choice ? "" : choice);
      const next = new Set(selected);
      if (next.has(choice)) next.delete(choice);
      else next.add(choice);
      // Ta'rifdagi tartibda
      onChange(
        options
          .map((o) => o.value)
          .filter((v) => next.has(v))
          .join(","),
      );
    };
    return (
      <fieldset className="space-y-1.5">
        <legend className="text-sm">{definition.name}</legend>
        <div className="flex flex-wrap gap-1.5">
          {choices.map((choice) => (
            <Chip
              key={choice.value}
              pressed={selected.has(choice.value)}
              onClick={() => toggle(choice.value)}
            >
              {choice.label}
            </Chip>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="font-normal">
        {definition.name}
      </Label>
      {definition.type === "select" ? (
        <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{t("notSelected")}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            value={value}
            maxLength={120}
            inputMode={definition.type === "number" ? "decimal" : undefined}
            onChange={(event) => onChange(event.target.value)}
          />
          {definition.unit && (
            <span className="shrink-0 text-sm text-muted-foreground">{definition.unit}</span>
          )}
        </div>
      )}
    </div>
  );
}

/** Yangi mahsulot uchun tanlangan rasmlar — mahsulot saqlangach yuklanadi */
function PendingPhotos({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const t = useTranslations("Admin");
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  return (
    <div className="space-y-2">
      <input
        id="item-photo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          const room = MAX_ITEM_PHOTOS - files.length;
          if (selected.length > room) toast.error(t("catalog.photosLimit"));
          onChange([...files, ...selected.slice(0, Math.max(0, room))]);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={files.length >= MAX_ITEM_PHOTOS}
        onClick={() => document.getElementById("item-photo-input")?.click()}
      >
        <ImagePlus aria-hidden="true" />
        {t("photos.add")}
      </Button>
      {files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {previews.map((url, index) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element -- mahalliy fayl ko'rinishi */}
              <img src={url} alt="" className="size-full object-cover" />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="absolute top-1 right-1"
                aria-label={t("photos.delete")}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">{t("catalog.photosAfterSave")}</p>
    </div>
  );
}

function ItemDialog({
  businessId,
  businessName,
  categorySlug,
  item,
  groups,
  initialKind,
  open,
  onOpenChange,
}: {
  businessId: string;
  businessName: string;
  categorySlug: string;
  item: AdminItem | null;
  /** Shu biznesdagi mavjud bo'limlar — bir xil yozilishi uchun taklif */
  groups: string[];
  initialKind: "product" | "service";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin");
  const queryClient = useQueryClient();
  const save = useSaveItem(businessId);
  const definitions = useCategoryAttributes(categorySlug, open);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingPending, setUploadingPending] = useState(false);
  const refreshItems = () =>
    void queryClient.invalidateQueries({ queryKey: adminItemsKey(businessId) });

  const schema = z
    .object({
      kind: z.enum(["product", "service"]),
      name: z
        .string()
        .trim()
        .min(2, t("validation.nameLength"))
        .max(120, t("validation.nameLength")),
      group: z.string().trim().max(60, t("validation.tooLong")),
      description: z.string().trim().max(1000, t("validation.tooLong")),
      priceType: z.enum(PRICE_TYPES),
      min: z.string(),
      max: z.string(),
      duration: z.string(),
      isAvailable: z.boolean(),
      // Kategoriya xususiyatlari: kalit → xom qiymat
      typed: z.record(z.string(), z.string()),
      extra: z.array(z.object({ name: z.string().max(40), value: z.string().max(120) })),
    })
    .superRefine((v, ctx) => {
      const min = Number(v.min);
      const max = Number(v.max);
      if (v.priceType !== "on_request" && !(Number.isFinite(min) && min > 0)) {
        ctx.addIssue({ code: "custom", path: ["min"], message: t("validation.price") });
      }
      if (v.priceType === "range" && !(Number.isFinite(max) && max > min)) {
        ctx.addIssue({ code: "custom", path: ["max"], message: t("validation.priceRange") });
      }
      const duration = Number(v.duration);
      if (
        v.kind === "service" &&
        v.duration &&
        !(Number.isInteger(duration) && duration >= 5 && duration <= 1440)
      ) {
        ctx.addIssue({ code: "custom", path: ["duration"], message: t("validation.duration") });
      }
      const count =
        Object.values(v.typed).filter(Boolean).length +
        v.extra.filter((a) => a.name.trim() && a.value.trim()).length;
      if (count > MAX_ATTRIBUTES) {
        ctx.addIssue({ code: "custom", path: ["typed"], message: t("validation.tooLong") });
      }
    });
  type Values = z.infer<typeof schema>;

  const attributeValues = item?.attributeValues ?? [];
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      kind: item?.kind ?? initialKind,
      name: item?.name ?? "",
      group: item?.group ?? "",
      description: item?.description ?? "",
      priceType: item?.price.type ?? "fixed",
      min: toSom(item?.price.min?.amount),
      max: toSom(item?.price.max?.amount),
      duration: item?.durationMinutes ? String(item.durationMinutes) : "",
      isAvailable: item?.isAvailable ?? true,
      typed: Object.fromEntries(
        attributeValues.flatMap((a) => (a.key ? [[a.key, a.value] as const] : [])),
      ),
      extra: attributeValues.filter((a) => !a.key).map(({ name, value }) => ({ name, value })),
    },
  });
  const extra = useFieldArray({ control: form.control, name: "extra" });
  const kind = useWatch({ control: form.control, name: "kind" });
  const priceType = useWatch({ control: form.control, name: "priceType" });
  const errors = form.formState.errors;
  // Xususiyatlar xatosi (server yoki soni) — butun guruhga
  const attributesError = (errors.typed as { message?: string } | undefined)?.message;

  const onSubmit = (v: Values) => {
    const body: ItemInput = {
      kind: v.kind,
      name: v.name,
      group: v.group || null,
      description: v.description || null,
      price: {
        type: v.priceType,
        min: v.priceType === "on_request" ? null : toTiyin(Number(v.min)),
        max: v.priceType === "range" ? toTiyin(Number(v.max)) : null,
      },
      durationMinutes: v.kind === "service" && v.duration ? Number(v.duration) : null,
      attributes: [
        // Kategoriyada hozir bor xususiyatlar (ta'rif o'chirilgan bo'lsa — yuborilmaydi)
        ...definitions
          .filter((d) => v.typed[d.key]?.trim())
          .map((d) => ({ key: d.key, name: d.name, value: v.typed[d.key]!.trim() })),
        ...v.extra
          .filter((a) => a.name.trim() && a.value.trim())
          .map((a) => ({ key: null, name: a.name, value: a.value })),
      ],
      isAvailable: v.isAvailable,
    };
    save.mutate(
      { itemId: item?.id, body },
      {
        onSuccess: async (saved) => {
          if (!item && pendingFiles.length > 0) {
            setUploadingPending(true);
            // Ketma-ket — sekin mobil internetda parallel yuklash hammasini sekinlashtiradi
            for (const [index, file] of pendingFiles.entries()) {
              try {
                await uploadPhoto(
                  `/api/v1/admin/businesses/${businessId}/items/${saved.id}/photos`,
                  file,
                  t("photos.alt", { name: saved.name, index: index + 1 }),
                );
              } catch {
                toast.error(t("photos.uploadError"));
              }
            }
            setUploadingPending(false);
            refreshItems();
          }
          onOpenChange(false);
        },
        onError: (error) => {
          if (
            !applyServerErrors(form, error, {
              name: "name",
              price: "min",
              durationMinutes: "duration",
              description: "description",
              attributes: "typed",
            })
          ) {
            toast.error(t("edit.saveError"));
          }
        },
      },
    );
  };

  const pending = save.isPending || uploadingPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? t("catalog.dialogEdit") : t("catalog.dialogNew")}</DialogTitle>
          <DialogDescription className="sr-only">{businessName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("catalog.kind")}</legend>
            <div className="flex gap-2">
              {(["product", "service"] as const).map((value) => (
                <label
                  key={value}
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                >
                  <input
                    type="radio"
                    value={value}
                    className="accent-primary"
                    {...form.register("kind")}
                  />
                  {t(`catalog.${value}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-2">
            <Label htmlFor="item-name">{t("catalog.name")}</Label>
            <Input id="item-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-description">{t("catalog.description")}</Label>
            <Textarea
              id="item-description"
              rows={3}
              maxLength={1000}
              aria-invalid={Boolean(errors.description)}
              {...form.register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-group">{t("catalog.group")}</Label>
            <Input
              id="item-group"
              placeholder={t("catalog.groupPlaceholder")}
              list={groups.length > 0 ? "item-group-options" : undefined}
              aria-describedby="item-group-hint"
              {...form.register("group")}
            />
            {groups.length > 0 && (
              <datalist id="item-group-options">
                {groups.map((group) => (
                  <option key={group} value={group} />
                ))}
              </datalist>
            )}
            <p id="item-group-hint" className="text-sm text-muted-foreground">
              {t("catalog.groupHint")}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-price-type">{t("catalog.priceType")}</Label>
            <Controller
              control={form.control}
              name="priceType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="item-price-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`catalog.priceTypes.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {priceType !== "on_request" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="item-min">{t("catalog.min")}</Label>
                <Input
                  id="item-min"
                  inputMode="numeric"
                  aria-invalid={Boolean(errors.min)}
                  {...form.register("min")}
                />
                {errors.min && <p className="text-sm text-destructive">{errors.min.message}</p>}
              </div>
              {priceType === "range" && (
                <div className="grid gap-2">
                  <Label htmlFor="item-max">{t("catalog.max")}</Label>
                  <Input
                    id="item-max"
                    inputMode="numeric"
                    aria-invalid={Boolean(errors.max)}
                    {...form.register("max")}
                  />
                  {errors.max && <p className="text-sm text-destructive">{errors.max.message}</p>}
                </div>
              )}
            </div>
          )}

          {kind === "service" && (
            <div className="grid gap-2">
              <Label htmlFor="item-duration">{t("catalog.duration")}</Label>
              <Input
                id="item-duration"
                inputMode="numeric"
                aria-invalid={Boolean(errors.duration)}
                {...form.register("duration")}
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Controller
              control={form.control}
              name="isAvailable"
              render={({ field }) => (
                <Switch
                  id="item-available"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="item-available">{t("catalog.available")}</Label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("catalog.photos")}</legend>
            <p className="text-sm text-muted-foreground">{t("catalog.photosHint")}</p>
            {item ? (
              <PhotoManager
                inputId="item-photo-input"
                compact
                photos={item.photos}
                max={MAX_ITEM_PHOTOS}
                canEdit
                uploadUrl={`/api/v1/admin/businesses/${businessId}/items/${item.id}/photos`}
                altFor={(index) => t("photos.alt", { name: item.name, index })}
                firstLabel={t("photos.main")}
                limitMessage={t("catalog.photosLimit")}
                reorder={(photoIds) =>
                  call(
                    browserApi.PUT("/admin/businesses/{businessId}/items/{itemId}/photos/order", {
                      params: { path: { businessId, itemId: item.id } },
                      body: { photoIds },
                    }),
                  )
                }
                remove={(photoId) =>
                  call(
                    browserApi.DELETE(
                      "/admin/businesses/{businessId}/items/{itemId}/photos/{photoId}",
                      { params: { path: { businessId, itemId: item.id, photoId } } },
                    ),
                  )
                }
                onChanged={refreshItems}
              />
            ) : (
              <PendingPhotos files={pendingFiles} onChange={setPendingFiles} />
            )}
          </fieldset>

          {definitions.length > 0 && (
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">{t("catalog.attributes")}</legend>
              <Controller
                control={form.control}
                name="typed"
                render={({ field }) => (
                  <>
                    {definitions.map((definition) => (
                      <AttributeField
                        key={definition.key}
                        definition={definition}
                        value={field.value[definition.key] ?? ""}
                        onChange={(value) =>
                          field.onChange({ ...field.value, [definition.key]: value })
                        }
                      />
                    ))}
                  </>
                )}
              />
            </fieldset>
          )}
          {attributesError && (
            <p role="alert" className="text-sm text-destructive">
              {attributesError}
            </p>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {definitions.length > 0 ? t("catalog.otherAttributes") : t("catalog.attributes")}
            </legend>
            {extra.fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  aria-label={t("catalog.attrName")}
                  placeholder={t("catalog.attrName")}
                  {...form.register(`extra.${index}.name`)}
                />
                <Input
                  aria-label={t("catalog.attrValue")}
                  placeholder={t("catalog.attrValue")}
                  {...form.register(`extra.${index}.value`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("catalog.removeAttribute")}
                  onClick={() => extra.remove(index)}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => extra.append({ name: "", value: "" })}
            >
              <Plus aria-hidden="true" />
              {t("catalog.addAttribute")}
            </Button>
          </fieldset>

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {t("catalog.save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Mahsulot va xizmatlar: darhol saqlanadi (har biri alohida) */
export function CatalogSection({ business, canEdit, submitLabel, onDone }: SectionProps) {
  const t = useTranslations("Admin.catalog");
  const tProfile = useTranslations("Profile");
  const { data: items, isPending } = useAdminItems(business.id);
  const remove = useDeleteItem(business.id);
  // Tahrirlanayotgan mahsulot ro'yxatdan olinadi — rasm qo'shilganda dialog yangilanadi
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Har ochilishda yangi dialog — oldingi tanlangan rasmlar va forma holati qolmaydi
  const [dialogKey, setDialogKey] = useState(0);
  const editing = items?.find((item) => item.id === editingId) ?? null;
  const groups = [...new Set((items ?? []).flatMap((item) => (item.group ? [item.group] : [])))];

  const openDialog = (item: AdminItem | null) => {
    setEditingId(item?.id ?? null);
    setDialogKey((key) => key + 1);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-5">
      {canEdit && (
        <Button type="button" variant="secondary" size="lg" onClick={() => openDialog(null)}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      )}

      {isPending ? (
        <Skeleton className="h-32" />
      ) : !items?.length ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 p-3">
              <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                {item.photos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element -- admin oldindan ko'rish
                  <img src={item.photos[0].url} alt="" className="size-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">
                  {[item.group, t(item.kind), !item.isAvailable && t("unavailable")]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <ItemPriceText price={item.price} className="text-sm" />
              {canEdit && (
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t("edit")}: ${item.name}`}
                    onClick={() => openDialog(item)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${t("delete")}: ${item.name}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    }
                    title={t("deleteConfirm", { name: item.name })}
                    confirmLabel={t("delete")}
                    cancelLabel={tProfile("cancel")}
                    pending={remove.isPending}
                    onConfirm={() => remove.mutateAsync(item.id)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <Button type="button" size="lg" className="w-full sm:w-auto" onClick={onDone}>
          {submitLabel}
        </Button>
      )}

      <ItemDialog
        key={dialogKey}
        businessId={business.id}
        businessName={business.name}
        categorySlug={business.category.slug}
        item={editing}
        groups={groups}
        initialKind={defaultKind(items ?? [], business.category.iconKey)}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
