"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentPathWithoutLocale, loginHref, useMe } from "@/features/auth/use-me";
import { useRouter } from "@/i18n/navigation";
import { browserApi, BrowserApiError, call } from "@/lib/api/browser";
import type { ComplaintReason } from "@/lib/api/types";
import { myComplaintsKey } from "./my-complaints-list";

const REASONS: ComplaintReason[] = [
  "wrong_info",
  "closed_permanently",
  "wrong_location",
  "fake_reviews",
  "fraud",
  "other",
];

export function ComplaintDialog({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const t = useTranslations("Complaint");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);

  const schema = z
    .object({
      reason: z.enum(REASONS, { error: t("validation.reason") }),
      text: z.string().trim().max(1000, t("validation.textMax")),
    })
    .refine((values) => values.reason !== "other" || values.text.length >= 10, {
      path: ["text"],
      message: t("validation.textOther"),
    });
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { text: "" } });
  const reason = useWatch({ control: form.control, name: "reason" });
  const errors = form.formState.errors;

  const submit = useMutation({
    mutationFn: (values: Values) =>
      call(
        browserApi.POST("/complaints", {
          body: { businessId, reason: values.reason, text: values.text || null },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myComplaintsKey });
      toast.success(t("success"));
      form.reset({ text: "" });
      setOpen(false);
    },
    onError: (error) => {
      if (error instanceof BrowserApiError && error.status === 401) {
        router.push(loginHref(currentPathWithoutLocale()));
      } else {
        form.setError("root", { message: t("error") });
      }
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="link"
        className="h-auto px-0 text-muted-foreground"
        onClick={() => (me ? setOpen(true) : router.push(loginHref(currentPathWithoutLocale())))}
      >
        <Flag aria-hidden="true" />
        {t("trigger")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title", { name: businessName })}</DialogTitle>
            <DialogDescription className="sr-only">{t("reasonLegend")}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((values) => submit.mutate(values))}
            noValidate
            className="space-y-5"
          >
            <fieldset aria-describedby={errors.reason ? "reason-error" : undefined}>
              <legend className="mb-2 text-sm font-medium">{t("reasonLegend")}</legend>
              <div className="grid gap-2">
                {REASONS.map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-checked:border-primary has-checked:bg-primary-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                  >
                    <input
                      type="radio"
                      value={value}
                      className="accent-primary"
                      {...form.register("reason")}
                    />
                    {t(`reasons.${value}`)}
                  </label>
                ))}
              </div>
              {errors.reason && (
                <p id="reason-error" className="mt-1 text-sm text-destructive">
                  {errors.reason.message}
                </p>
              )}
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="complaint-text">
                {t("text")}
                {reason === "other" && (
                  <span className="font-normal text-muted-foreground"> — {t("textHintOther")}</span>
                )}
              </Label>
              <Textarea
                id="complaint-text"
                rows={3}
                maxLength={1000}
                placeholder={t("textPlaceholder")}
                aria-invalid={Boolean(errors.text)}
                aria-describedby={errors.text ? "complaint-text-error" : undefined}
                {...form.register("text")}
              />
              {errors.text && (
                <p id="complaint-text-error" className="text-sm text-destructive">
                  {errors.text.message}
                </p>
              )}
            </div>

            {errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={submit.isPending}>
              {submit.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {t("submit")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
