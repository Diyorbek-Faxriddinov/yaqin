"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
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
import { ItemPriceText } from "@/features/business/components/item-list";
import { browserApi, call } from "@/lib/api/browser";
import type { AttributeDefinition, Item, ItemInput } from "@/lib/api/types";
import {
  applyServerErrors,
  useAdminItems,
  useDeleteItem,
  useSaveItem,
} from "../../use-admin-business";
import type { SectionProps } from "./section-props";

const PRICE_TYPES = ["fixed", "from", "range", "on_request"] as const;
const toSom = (amount?: number | null) => (amount != null ? String(Math.round(amount / 100)) : "");
const toTiyin = (som: number) => ({ amount: Math.round(som * 100), currency: "UZS" as const });

/** Kategoriya atributlari (admin belgilaydi) — katalog formasida tayyor xususiyat sifatida */
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

/** Qiymat maydoni uchun maslahat: variantlar, birlik yoki Ha/Yo'q */
function valueHint(definition: AttributeDefinition | undefined, yesNo: string): string | undefined {
  if (!definition) return undefined;
  if (definition.type === "boolean") return yesNo;
  if (definition.options?.length) return definition.options.map((o) => o.label).join(", ");
  return definition.unit ?? undefined;
}

function ItemDialog({
  businessId,
  categorySlug,
  item,
  open,
  onOpenChange,
}: {
  businessId: string;
  categorySlug: string;
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin");
  const save = useSaveItem(businessId);

  const schema = z
    .object({
      kind: z.enum(["product", "service"]),
      name: z
        .string()
        .trim()
        .min(2, t("validation.nameLength"))
        .max(120, t("validation.nameLength")),
      group: z.string().trim().max(60, t("validation.tooLong")),
      priceType: z.enum(PRICE_TYPES),
      min: z.string(),
      max: z.string(),
      duration: z.string(),
      isAvailable: z.boolean(),
      attributes: z
        .array(z.object({ name: z.string().max(40), value: z.string().max(120) }))
        .max(20),
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
    });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      kind: item?.kind ?? "service",
      name: item?.name ?? "",
      group: item?.group ?? "",
      priceType: item?.price.type ?? "fixed",
      min: toSom(item?.price.min?.amount),
      max: toSom(item?.price.max?.amount),
      duration: item?.durationMinutes ? String(item.durationMinutes) : "",
      isAvailable: item?.isAvailable ?? true,
      attributes: item?.attributes.map(({ name, value }) => ({ name, value })) ?? [],
    },
  });
  const attributes = useFieldArray({ control: form.control, name: "attributes" });
  const definitions = useCategoryAttributes(categorySlug, open);
  const currentAttributes = useWatch({ control: form.control, name: "attributes" });
  const usedNames = new Set(currentAttributes.map((a) => a.name.trim().toLowerCase()));
  const suggestions = definitions.filter((d) => !usedNames.has(d.name.toLowerCase()));
  const definitionFor = (name: string) =>
    definitions.find((d) => d.name.toLowerCase() === name.trim().toLowerCase());
  const kind = useWatch({ control: form.control, name: "kind" });
  const priceType = useWatch({ control: form.control, name: "priceType" });
  const errors = form.formState.errors;

  const onSubmit = (v: Values) => {
    const body: ItemInput = {
      kind: v.kind,
      name: v.name,
      group: v.group || null,
      description: item?.description ?? null,
      price: {
        type: v.priceType,
        min: v.priceType === "on_request" ? null : toTiyin(Number(v.min)),
        max: v.priceType === "range" ? toTiyin(Number(v.max)) : null,
      },
      durationMinutes: v.kind === "service" && v.duration ? Number(v.duration) : null,
      attributes: v.attributes.filter((a) => a.name.trim() && a.value.trim()),
      isAvailable: v.isAvailable,
    };
    save.mutate(
      { itemId: item?.id, body },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          if (
            !applyServerErrors(form, error, {
              name: "name",
              price: "min",
              durationMinutes: "duration",
            })
          ) {
            toast.error(t("edit.saveError"));
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? t("catalog.dialogEdit") : t("catalog.dialogNew")}</DialogTitle>
          <DialogDescription className="sr-only">{t("catalog.dialogNew")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("catalog.kind")}</legend>
            <div className="flex gap-2">
              {(["service", "product"] as const).map((value) => (
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
            <Label htmlFor="item-group">{t("catalog.group")}</Label>
            <Input
              id="item-group"
              placeholder={t("catalog.groupPlaceholder")}
              {...form.register("group")}
            />
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
            <legend className="text-sm font-medium">{t("catalog.attributes")}</legend>
            {suggestions.length > 0 && (
              <div
                role="group"
                aria-label={t("catalog.suggested")}
                className="flex flex-wrap gap-2"
              >
                {suggestions.map((definition) => (
                  <Button
                    key={definition.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => attributes.append({ name: definition.name, value: "" })}
                  >
                    <Plus aria-hidden="true" />
                    {definition.name}
                  </Button>
                ))}
              </div>
            )}
            {attributes.fields.map((field, index) => {
              const definition = definitionFor(currentAttributes[index]?.name ?? "");
              const listId = `attribute-options-${index}`;
              const choices =
                definition?.type === "boolean"
                  ? [t("catalog.yes"), t("catalog.no")]
                  : (definition?.options?.map((o) => o.label) ?? []);
              return (
                <div key={field.id} className="flex gap-2">
                  <Input
                    aria-label={t("catalog.attrName")}
                    placeholder={t("catalog.attrName")}
                    {...form.register(`attributes.${index}.name`)}
                  />
                  <Input
                    aria-label={t("catalog.attrValue")}
                    placeholder={
                      valueHint(definition, `${t("catalog.yes")} / ${t("catalog.no")}`) ??
                      t("catalog.attrValue")
                    }
                    inputMode={definition?.type === "number" ? "decimal" : undefined}
                    list={choices.length > 0 ? listId : undefined}
                    {...form.register(`attributes.${index}.value`)}
                  />
                  {choices.length > 0 && (
                    <datalist id={listId}>
                      {choices.map((choice) => (
                        <option key={choice} value={choice} />
                      ))}
                    </datalist>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("catalog.removeAttribute")}
                    onClick={() => attributes.remove(index)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => attributes.append({ name: "", value: "" })}
            >
              <Plus aria-hidden="true" />
              {t("catalog.addAttribute")}
            </Button>
          </fieldset>

          <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
            {save.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
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
  const [editing, setEditing] = useState<Item | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = (item: Item | null) => {
    setEditing(item);
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
        businessId={business.id}
        categorySlug={business.category.slug}
        item={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
