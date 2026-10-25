"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { RetryButton } from "@/components/common/retry-button";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
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
import { Link } from "@/i18n/navigation";
import type { AdminAttribute } from "@/lib/api/types";
import { toKey, uniqueKey } from "../slug";
import { useAdminCategories, useSetAttributes } from "../use-moderation";

const TYPES = ["text", "number", "boolean", "select", "multiselect"] as const;
const hasOptions = (type: AdminAttribute["type"]) => type === "select" || type === "multiselect";

function AttributeDialog({
  open,
  attribute,
  takenKeys,
  pending,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  /** null — yangi atribut */
  attribute: AdminAttribute | null;
  takenKeys: string[];
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (attribute: AdminAttribute) => void;
}) {
  const t = useTranslations("Admin.attributes");

  const label = z.string().trim().min(1, t("validation.label")).max(60, t("validation.label"));
  const schema = z
    .object({
      uz: label,
      ru: label,
      type: z.enum(TYPES),
      unit: z.string().trim().max(20, t("validation.unit")),
      options: z.array(z.object({ value: z.string(), uz: label, ru: label })).max(30),
    })
    .superRefine((v, ctx) => {
      if (hasOptions(v.type) && v.options.length < 2) {
        ctx.addIssue({ code: "custom", path: ["options"], message: t("validation.options") });
      }
    });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      uz: attribute?.name.uz ?? "",
      ru: attribute?.name.ru ?? "",
      type: attribute?.type ?? "text",
      unit: attribute?.unit ?? "",
      options:
        attribute?.options.map((o) => ({ value: o.value, uz: o.label.uz, ru: o.label.ru })) ?? [],
    },
  });
  const options = useFieldArray({ control: form.control, name: "options" });
  const type = useWatch({ control: form.control, name: "type" });
  const errors = form.formState.errors;

  const onSubmit = (v: Values) => {
    // Kalit yangi atributda nomdan yasaladi va keyin o'zgarmaydi
    const key = attribute?.key ?? uniqueKey(toKey(v.uz) || toKey(v.ru) || "attr", takenKeys);
    const values: string[] = [];
    onSave({
      key,
      name: { uz: v.uz, ru: v.ru },
      type: v.type,
      unit: v.type === "number" ? v.unit || null : null,
      options: hasOptions(v.type)
        ? v.options.map((o) => {
            const value = o.value || uniqueKey(toKey(o.uz) || "v", values);
            values.push(value);
            return { value, label: { uz: o.uz, ru: o.ru } };
          })
        : [],
      filterable: attribute?.filterable ?? false,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{attribute ? t("editTitle") : t("newTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form noValidate className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="attribute-uz">{t("nameUz")}</Label>
              <Input
                id="attribute-uz"
                placeholder={t("namePlaceholder")}
                aria-invalid={Boolean(errors.uz)}
                {...form.register("uz")}
              />
              {errors.uz && <p className="text-sm text-destructive">{errors.uz.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="attribute-ru">{t("nameRu")}</Label>
              <Input
                id="attribute-ru"
                lang="ru"
                aria-invalid={Boolean(errors.ru)}
                {...form.register("ru")}
              />
              {errors.ru && <p className="text-sm text-destructive">{errors.ru.message}</p>}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="attribute-type">{t("type")}</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="attribute-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`types.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {type === "number" && (
            <div className="grid gap-2">
              <Label htmlFor="attribute-unit">{t("unit")}</Label>
              <Input
                id="attribute-unit"
                placeholder={t("unitPlaceholder")}
                {...form.register("unit")}
              />
            </div>
          )}

          {hasOptions(type) && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("options")}</legend>
              {options.fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    aria-label={t("optionUz", { index: index + 1 })}
                    placeholder={t("optionUzPlaceholder")}
                    aria-invalid={Boolean(errors.options?.[index]?.uz)}
                    {...form.register(`options.${index}.uz`)}
                  />
                  <Input
                    lang="ru"
                    aria-label={t("optionRu", { index: index + 1 })}
                    placeholder={t("optionRuPlaceholder")}
                    aria-invalid={Boolean(errors.options?.[index]?.ru)}
                    {...form.register(`options.${index}.ru`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("removeOption", { index: index + 1 })}
                    onClick={() => options.remove(index)}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ))}
              {errors.options?.message && (
                <p className="text-sm text-destructive">{errors.options.message}</p>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => options.append({ value: "", uz: "", ru: "" })}
              >
                <Plus aria-hidden="true" />
                {t("addOption")}
              </Button>
            </fieldset>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {t("save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Editing = { index: number | null } | null;

/** Ichki kategoriya atributlari: katalog formasida tayyor xususiyat sifatida taklif qilinadi */
export function CategoryAttributes({ id }: { id: string }) {
  const t = useTranslations("Admin.attributes");
  const tStates = useTranslations("States");
  const { data, isPending, isError, refetch } = useAdminCategories();
  const save = useSetAttributes(id);
  const [editing, setEditing] = useState<Editing>(null);

  const category = data?.find((c) => c.id === id);
  const parent = data?.find((c) => c.id === category?.parentId);
  const attributes = category?.attributes ?? [];

  const persist = (next: AdminAttribute[], onDone?: () => void) =>
    save.mutate(next, {
      onSuccess: () => {
        toast.success(t("saved"));
        onDone?.();
      },
      onError: () => toast.error(t("error")),
    });

  const move = (index: number, delta: number) => {
    const next = [...attributes];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + delta, 0, item);
    persist(next);
  };

  if (isPending) return <Skeleton className="mx-auto h-96 max-w-3xl" />;
  if (isError) {
    return (
      <ErrorState
        title={tStates("errorTitle")}
        description={tStates("errorDescription")}
        action={<RetryButton onRetry={() => void refetch()} />}
      />
    );
  }
  if (!category || category.parentId === null) {
    return (
      <EmptyState
        title={t("notFound")}
        action={
          <Button asChild variant="outline">
            <Link href="/admin/kategoriyalar">{t("back")}</Link>
          </Button>
        }
      />
    );
  }

  const current = editing?.index != null ? (attributes[editing.index] ?? null) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/admin/kategoriyalar">
          <ArrowLeft aria-hidden="true" />
          {t("back")}
        </Link>
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{parent?.name.uz}</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {t("title", { name: category.name.uz })}
          </h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setEditing({ index: null })} disabled={attributes.length >= 20}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      </div>

      {attributes.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyDescription")} />
      ) : (
        <ol className="divide-y rounded-xl border">
          {attributes.map((attribute, index) => (
            <li key={attribute.key} className="flex items-center gap-2 p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{attribute.name.uz}</span>
                  <span lang="ru" className="text-sm text-muted-foreground">
                    {attribute.name.ru}
                  </span>
                  <Badge variant="secondary">{t(`types.${attribute.type}`)}</Badge>
                </p>
                {(attribute.unit || attribute.options.length > 0) && (
                  <p className="text-xs text-muted-foreground">
                    {attribute.unit
                      ? t("unitValue", { unit: attribute.unit })
                      : attribute.options.map((o) => o.label.uz).join(", ")}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("moveUp", { name: attribute.name.uz })}
                disabled={index === 0 || save.isPending}
                onClick={() => move(index, -1)}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("moveDown", { name: attribute.name.uz })}
                disabled={index === attributes.length - 1 || save.isPending}
                onClick={() => move(index, 1)}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("edit", { name: attribute.name.uz })}
                onClick={() => setEditing({ index })}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <ConfirmDialog
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("delete", { name: attribute.name.uz })}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                }
                title={t("deleteConfirm", { name: attribute.name.uz })}
                description={t("deleteHint")}
                confirmLabel={t("deleteAction")}
                cancelLabel={t("cancel")}
                pending={save.isPending}
                onConfirm={() => persist(attributes.filter((_, i) => i !== index))}
              />
            </li>
          ))}
        </ol>
      )}

      <AttributeDialog
        key={editing ? String(editing.index) : "closed"}
        open={editing !== null}
        attribute={current}
        takenKeys={attributes.map((a) => a.key)}
        pending={save.isPending}
        onOpenChange={(open) => !open && setEditing(null)}
        onSave={(attribute) => {
          const next =
            editing?.index != null
              ? attributes.map((a, i) => (i === editing.index ? attribute : a))
              : [...attributes, attribute];
          persist(next, () => setEditing(null));
        }}
      />
    </div>
  );
}
