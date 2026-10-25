"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminBusiness } from "@/lib/api/types";
import {
  applyServerErrors,
  useCatalogOptions,
  useCreateBusiness,
  useUpdateBusiness,
} from "../../use-admin-business";

type Props = {
  /** null — yangi biznes yaratish (ustaning 1-qadami) */
  business: AdminBusiness | null;
  canEdit: boolean;
  submitLabel: string;
  onDone: (business: AdminBusiness) => void;
};

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

export function BasicSection({ business, canEdit, submitLabel, onDone }: Props) {
  const t = useTranslations("Admin");
  const { categories, districts } = useCatalogOptions();
  const create = useCreateBusiness();
  const update = useUpdateBusiness(business?.id ?? "");

  const schema = z.object({
    name: z.string().trim().min(2, t("validation.nameLength")).max(120, t("validation.nameLength")),
    categorySlug: z.string().min(1, t("validation.category")),
    districtSlug: z.string().min(1, t("validation.district")),
    description: z.string().trim().max(2000, t("validation.tooLong")),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: business?.name ?? "",
      categorySlug: business?.category.slug ?? "",
      districtSlug: business?.district.slug ?? "",
      description: business?.description ?? "",
    },
  });
  const errors = form.formState.errors;
  const pending = create.isPending || update.isPending;

  const onSubmit = (values: Values) => {
    const handlers = {
      onSuccess: onDone,
      onError: (error: unknown) => {
        if (
          !applyServerErrors(form, error, {
            name: "name",
            categorySlug: "categorySlug",
            districtSlug: "districtSlug",
          })
        ) {
          toast.error(t("edit.saveError"));
        }
      },
    };
    if (business) {
      update.mutate({ ...values, description: values.description || null }, handlers);
    } else {
      create.mutate(
        { name: values.name, categorySlug: values.categorySlug, districtSlug: values.districtSlug },
        handlers,
      );
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      <fieldset disabled={!canEdit} className="space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="business-name">{t("basic.name")}</Label>
          <Input
            id="business-name"
            placeholder={t("basic.namePlaceholder")}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "business-name-error" : undefined}
            {...form.register("name")}
          />
          <FieldError id="business-name-error" message={errors.name?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="business-category">{t("basic.category")}</Label>
          <Controller
            control={form.control}
            name="categorySlug"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                <SelectTrigger
                  id="business-category"
                  className="w-full"
                  aria-invalid={Boolean(errors.categorySlug)}
                  aria-describedby={errors.categorySlug ? "business-category-error" : undefined}
                >
                  <SelectValue placeholder={t("basic.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {categories.map((root) => (
                    <SelectGroup key={root.id}>
                      <SelectLabel>{root.name}</SelectLabel>
                      {root.children.map((child) => (
                        <SelectItem key={child.id} value={child.slug}>
                          {child.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="business-category-error" message={errors.categorySlug?.message} />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="business-district">{t("basic.district")}</Label>
          <Controller
            control={form.control}
            name="districtSlug"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit}>
                <SelectTrigger
                  id="business-district"
                  className="w-full"
                  aria-invalid={Boolean(errors.districtSlug)}
                  aria-describedby={errors.districtSlug ? "business-district-error" : undefined}
                >
                  <SelectValue placeholder={t("basic.districtPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.slug}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError id="business-district-error" message={errors.districtSlug?.message} />
        </div>

        {business && (
          <div className="grid gap-2">
            <Label htmlFor="business-description">{t("basic.description")}</Label>
            <Textarea
              id="business-description"
              rows={4}
              maxLength={2000}
              {...form.register("description")}
            />
            <FieldError id="business-description-error" message={errors.description?.message} />
          </div>
        )}
      </fieldset>

      {canEdit && (
        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {business ? submitLabel : t("basic.create")}
        </Button>
      )}
    </form>
  );
}
