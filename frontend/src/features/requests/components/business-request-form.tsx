"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@/i18n/navigation";
import { browserApi, BrowserApiError, call } from "@/lib/api/browser";
import type { District } from "@/lib/api/types";
import { normalizeUzPhone } from "@/lib/format/phone";

const NO_DISTRICT = "none";

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

/** "Biznesingizni qo'shing" — kirish shart emas; administrator bog'lanib, biznesni joyida qo'shadi */
export function BusinessRequestForm({ districts }: { districts: District[] }) {
  const t = useTranslations("AddBusiness");
  const [done, setDone] = useState(false);

  const schema = z.object({
    businessName: z
      .string()
      .trim()
      .min(2, t("validation.businessName"))
      .max(120, t("validation.tooLong")),
    activity: z.string().trim().max(100, t("validation.tooLong")),
    districtSlug: z.string(),
    address: z.string().trim().max(300, t("validation.tooLong")),
    contactName: z
      .string()
      .trim()
      .min(2, t("validation.contactName"))
      .max(60, t("validation.tooLong")),
    phone: z.string().refine((value) => normalizeUzPhone(value) !== null, t("validation.phone")),
    note: z.string().trim().max(1000, t("validation.tooLong")),
    agree: z.boolean().refine(Boolean, t("validation.agree")),
  });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName: "",
      activity: "",
      districtSlug: NO_DISTRICT,
      address: "",
      contactName: "",
      phone: "",
      note: "",
      agree: false,
    },
  });
  const errors = form.formState.errors;

  const submit = useMutation({
    mutationFn: (values: Values) =>
      call(
        browserApi.POST("/business-requests", {
          body: {
            businessName: values.businessName,
            activity: values.activity || null,
            districtSlug: values.districtSlug === NO_DISTRICT ? null : values.districtSlug,
            address: values.address || null,
            contactName: values.contactName,
            phone: normalizeUzPhone(values.phone) ?? values.phone,
            note: values.note || null,
            agree: true,
          },
        }),
      ),
    onSuccess: () => {
      setDone(true);
      window.scrollTo({ top: 0 });
    },
  });

  const submitError =
    submit.error instanceof BrowserApiError
      ? submit.error.status === 429
        ? t("errors.tooMany")
        : submit.error.body?.code === "requests_closed"
          ? t("errors.closed")
          : t("errors.generic")
      : submit.error
        ? t("errors.generic")
        : null;

  if (done) {
    return (
      <div role="status" className="space-y-4 rounded-2xl border bg-success-soft p-6 text-center">
        <CircleCheck aria-hidden="true" className="mx-auto size-12 text-success" />
        <h2 className="text-xl font-semibold">{t("success.title")}</h2>
        <p>{t("success.text")}</p>
        <Button asChild variant="outline">
          <Link href="/">{t("success.home")}</Link>
        </Button>
      </div>
    );
  }

  const text = (name: "businessName" | "activity" | "address" | "contactName", props = {}) => (
    <div className="grid gap-2">
      <Label htmlFor={`request-${name}`}>{t(`fields.${name}`)}</Label>
      <Input
        id={`request-${name}`}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `request-${name}-error` : undefined}
        {...props}
        {...form.register(name)}
      />
      <FieldError id={`request-${name}-error`} message={errors[name]?.message} />
    </div>
  );

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={form.handleSubmit((values) => submit.mutate(values))}
    >
      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">{t("business")}</legend>
        {text("businessName", { placeholder: t("placeholders.businessName") })}
        {text("activity", { placeholder: t("placeholders.activity") })}
        <div className="grid gap-2">
          <Label htmlFor="request-district">{t("fields.district")}</Label>
          <Controller
            control={form.control}
            name="districtSlug"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="request-district" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DISTRICT}>{t("noDistrict")}</SelectItem>
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.slug}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        {text("address", { placeholder: t("placeholders.address") })}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">{t("contact")}</legend>
        {text("contactName", { autoComplete: "name" })}
        <div className="grid gap-2">
          <Label htmlFor="request-phone">{t("fields.phone")}</Label>
          <Input
            id="request-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="90 123 45 67"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "request-phone-error" : undefined}
            {...form.register("phone")}
          />
          <FieldError id="request-phone-error" message={errors.phone?.message} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="request-note">{t("fields.note")}</Label>
          <Textarea
            id="request-note"
            rows={3}
            maxLength={1000}
            placeholder={t("placeholders.note")}
            {...form.register("note")}
          />
          <FieldError id="request-note-error" message={errors.note?.message} />
        </div>
      </fieldset>

      <div className="space-y-1">
        <div className="flex items-start gap-3">
          <Controller
            control={form.control}
            name="agree"
            render={({ field }) => (
              <Checkbox
                id="request-agree"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={Boolean(errors.agree)}
                aria-describedby={errors.agree ? "request-agree-error" : undefined}
                className="mt-0.5"
              />
            )}
          />
          <Label htmlFor="request-agree" className="leading-snug font-normal">
            <span>
              {t.rich("agree", {
                link: (chunks) => (
                  <Link href="/maxfiylik" className="underline underline-offset-4">
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </Label>
        </div>
        <FieldError id="request-agree-error" message={errors.agree?.message} />
      </div>

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submit.isPending}>
        {submit.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
        {t("submit")}
      </Button>
    </form>
  );
}
