"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ListChecks, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { RetryButton } from "@/components/common/retry-button";
import { ErrorState } from "@/components/common/states";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  CATEGORY_ICONS,
  CategoryIcon,
  type CategoryIconKey,
} from "@/features/category/category-icon";
import { Link } from "@/i18n/navigation";
import { BrowserApiError } from "@/lib/api/browser";
import type { AdminCategory } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { toSlug } from "../slug";
import { applyServerErrors } from "../use-admin-business";
import {
  useAdminCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "../use-moderation";

const ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[];

type DialogState =
  | { mode: "create"; parent: AdminCategory | null }
  | { mode: "edit"; category: AdminCategory }
  | null;

function CategoryDialog({
  state,
  onOpenChange,
}: {
  state: DialogState;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin.categories");
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const editing = state?.mode === "edit" ? state.category : null;
  const parent = state?.mode === "create" ? state.parent : null;
  const isRoot = editing ? editing.parentId === null : parent === null;
  const [slugTouched, setSlugTouched] = useState(false);

  const schema = z.object({
    uz: z.string().trim().min(2, t("validation.name")).max(60, t("validation.name")),
    ru: z.string().trim().min(2, t("validation.name")).max(60, t("validation.name")),
    slug: editing
      ? z.string()
      : z
          .string()
          .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, t("validation.slug"))
          .min(2, t("validation.slug"))
          .max(60, t("validation.slug")),
    iconKey: isRoot ? z.string().min(1, t("validation.icon")) : z.string(),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      uz: editing?.name.uz ?? "",
      ru: editing?.name.ru ?? "",
      slug: editing?.slug ?? "",
      iconKey: editing?.iconKey ?? "",
    },
  });
  const errors = form.formState.errors;
  const pending = create.isPending || update.isPending;
  const iconKey = useWatch({ control: form.control, name: "iconKey" });

  const onSubmit = (values: Values) => {
    const name = { uz: values.uz, ru: values.ru };
    const icon = isRoot ? { iconKey: values.iconKey as CategoryIconKey } : {};
    const options = {
      onSuccess: () => {
        toast.success(t("saved"));
        onOpenChange(false);
      },
      onError: (error: unknown) => {
        if (!applyServerErrors(form, error, { slug: "slug", name: "uz", iconKey: "iconKey" })) {
          toast.error(t("error"));
        }
      },
    };
    if (editing) {
      update.mutate({ id: editing.id, body: { name, ...icon } }, options);
    } else {
      create.mutate({ slug: values.slug, name, parentId: parent?.id ?? null, ...icon }, options);
    }
  };

  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("editTitle") : isRoot ? t("newRootTitle") : t("newChildTitle")}
          </DialogTitle>
          {parent && (
            <DialogDescription>{t("parentHint", { name: parent.name.uz })}</DialogDescription>
          )}
        </DialogHeader>
        <form noValidate className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="category-uz">{t("nameUz")}</Label>
            <Input
              id="category-uz"
              aria-invalid={Boolean(errors.uz)}
              aria-describedby={errors.uz ? "category-uz-error" : undefined}
              {...form.register("uz", {
                onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
                  if (!editing && !slugTouched) {
                    form.setValue("slug", toSlug(event.target.value));
                  }
                },
              })}
            />
            {errors.uz && (
              <p id="category-uz-error" className="text-sm text-destructive">
                {errors.uz.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category-ru">{t("nameRu")}</Label>
            <Input
              id="category-ru"
              lang="ru"
              aria-invalid={Boolean(errors.ru)}
              aria-describedby={errors.ru ? "category-ru-error" : undefined}
              {...form.register("ru")}
            />
            {errors.ru && (
              <p id="category-ru-error" className="text-sm text-destructive">
                {errors.ru.message}
              </p>
            )}
          </div>
          {!editing && (
            <div className="grid gap-2">
              <Label htmlFor="category-slug">{t("slug")}</Label>
              <Input
                id="category-slug"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.slug)}
                aria-describedby="category-slug-hint"
                {...form.register("slug", { onChange: () => setSlugTouched(true) })}
              />
              <p id="category-slug-hint" className="text-xs text-muted-foreground">
                {errors.slug ? (
                  <span className="text-destructive">{errors.slug.message}</span>
                ) : (
                  t("slugHint")
                )}
              </p>
            </div>
          )}
          {isRoot && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{t("icon")}</legend>
              <Controller
                control={form.control}
                name="iconKey"
                render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {ICON_KEYS.map((key) => (
                      <label
                        key={key}
                        className={cn(
                          "flex aspect-square cursor-pointer items-center justify-center rounded-lg border transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                          iconKey === key
                            ? "border-primary bg-primary-soft text-primary-soft-foreground"
                            : "hover:bg-muted",
                        )}
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={key}
                          checked={field.value === key}
                          onChange={() => field.onChange(key)}
                          className="sr-only"
                        />
                        <CategoryIcon iconKey={key} className="size-5" />
                        <span className="sr-only">{t(`icons.${key}`)}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
              {errors.iconKey && (
                <p className="text-sm text-destructive">{errors.iconKey.message}</p>
              )}
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

function DeleteButton({ category }: { category: AdminCategory }) {
  const t = useTranslations("Admin.categories");
  const remove = useDeleteCategory();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="icon" aria-label={t("delete", { name: category.name.uz })}>
          <Trash2 aria-hidden="true" />
        </Button>
      }
      title={t("deleteConfirm", { name: category.name.uz })}
      confirmLabel={t("deleteAction")}
      cancelLabel={t("cancel")}
      pending={remove.isPending}
      onConfirm={async () => {
        try {
          await remove.mutateAsync(category.id);
          toast.success(t("deleted"));
        } catch (error) {
          toast.error(error instanceof BrowserApiError ? error.message : t("error"));
        }
      }}
    />
  );
}

function dialogKey(state: DialogState): string {
  if (!state) return "closed";
  return state.mode === "edit" ? state.category.id : `new-${state.parent?.id ?? "root"}`;
}

/** Kategoriyalar daraxti: yo'nalishlar (ikonka bilan) va ichki kategoriyalar (atributlar bilan) */
export function CategoryManager() {
  const t = useTranslations("Admin.categories");
  const tStates = useTranslations("States");
  const { data, isPending, isError, refetch } = useAdminCategories();
  const [dialog, setDialog] = useState<DialogState>(null);

  const roots = data?.filter((c) => c.parentId === null) ?? [];
  const childrenOf = (root: AdminCategory) => data?.filter((c) => c.parentId === root.id) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <Button onClick={() => setDialog({ mode: "create", parent: null })}>
          <Plus aria-hidden="true" />
          {t("addRoot")}
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title={tStates("errorTitle")}
          description={tStates("errorDescription")}
          action={<RetryButton onRetry={() => void refetch()} />}
        />
      ) : (
        <div className="space-y-4">
          {roots.map((root) => {
            const children = childrenOf(root);
            return (
              <section
                key={root.id}
                aria-labelledby={`category-${root.id}`}
                className="rounded-xl border"
              >
                <header className="flex items-center gap-3 border-b p-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                    <CategoryIcon iconKey={root.iconKey} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 id={`category-${root.id}`} className="font-semibold">
                      {root.name.uz}
                    </h2>
                    <p lang="ru" className="text-sm text-muted-foreground">
                      {root.name.ru} · {t("businesses", { count: root.businessCount })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("edit", { name: root.name.uz })}
                    onClick={() => setDialog({ mode: "edit", category: root })}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  {children.length === 0 && root.businessCount === 0 && (
                    <DeleteButton category={root} />
                  )}
                </header>
                <ul className="divide-y">
                  {children.map((child) => (
                    <li key={child.id} className="flex items-center gap-2 py-2 pr-2 pl-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{child.name.uz}</p>
                        <p className="flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                          <span lang="ru">{child.name.ru}</span>
                          <span>· {t("businesses", { count: child.businessCount })}</span>
                        </p>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/kategoriyalar/${child.id}`}>
                          <ListChecks aria-hidden="true" />
                          <span className="sr-only sm:not-sr-only">{t("attributes")}</span>
                          {child.attributes.length > 0 && (
                            <Badge variant="secondary">{child.attributes.length}</Badge>
                          )}
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("edit", { name: child.name.uz })}
                        onClick={() => setDialog({ mode: "edit", category: child })}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      {child.businessCount === 0 && <DeleteButton category={child} />}
                    </li>
                  ))}
                </ul>
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDialog({ mode: "create", parent: root })}
                  >
                    <Plus aria-hidden="true" />
                    {t("addChild")}
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* key — har ochilishda forma holati (slug qo'lda o'zgartirilganmi) yangidan boshlanadi */}
      <CategoryDialog
        key={dialogKey(dialog)}
        state={dialog}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </div>
  );
}
