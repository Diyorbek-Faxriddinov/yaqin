"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, PenLine, Star } from "lucide-react";
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
import { BrowserApiError } from "@/lib/api/browser";
import { cn } from "@/lib/utils";
import { useCreateReview } from "../use-my-reviews";

const MAX_TEXT = 1000;

export function ReviewFormDialog({ slug, businessName }: { slug: string; businessName: string }) {
  const t = useTranslations("ReviewForm");
  const router = useRouter();
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const create = useCreateReview(slug);

  // Radio qiymati satr ("4") — zod uni songa o'giradi (RHF valueAs* radio'da ishlamaydi)
  const schema = z.object({
    rating: z.coerce
      .number({ error: t("validation.rating") })
      .int()
      .min(1, t("validation.rating"))
      .max(5),
    text: z.string().trim().max(MAX_TEXT, t("validation.textMax")),
  });
  type Values = z.output<typeof schema>;

  const form = useForm<z.input<typeof schema>, unknown, Values>({
    resolver: zodResolver(schema),
    defaultValues: { rating: "", text: "" },
  });
  const rating = Number(useWatch({ control: form.control, name: "rating" }) || 0);
  const text = useWatch({ control: form.control, name: "text" }) ?? "";
  const errors = form.formState.errors;

  const onTrigger = () => {
    if (!me) {
      router.push(loginHref(currentPathWithoutLocale()));
      return;
    }
    setOpen(true);
  };

  const onSubmit = (values: Values) =>
    create.mutate(
      { rating: values.rating, text: values.text || null },
      {
        onSuccess: () => {
          toast.success(t("success"));
          form.reset();
          setOpen(false);
        },
        onError: (error) => {
          if (error instanceof BrowserApiError && error.status === 409) {
            form.setError("root", { message: t("exists") });
          } else if (error instanceof BrowserApiError && error.status === 401) {
            router.push(loginHref(currentPathWithoutLocale()));
          } else {
            form.setError("root", { message: t("error") });
          }
        },
      },
    );

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={onTrigger}>
        <PenLine aria-hidden="true" />
        {t("trigger")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title", { name: businessName })}</DialogTitle>
            <DialogDescription>{t("rules")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
            <fieldset aria-describedby={errors.rating ? "rating-error" : undefined}>
              <legend className="mb-2 text-sm font-medium">{t("ratingLegend")}</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label
                    key={value}
                    className="cursor-pointer rounded-md p-1 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...form.register("rating")}
                    />
                    <Star
                      aria-hidden="true"
                      className={cn(
                        "size-8 transition-colors",
                        rating && value <= rating
                          ? "fill-highlight text-highlight"
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="sr-only">{t("star", { count: value })}</span>
                  </label>
                ))}
              </div>
              {errors.rating && (
                <p id="rating-error" className="mt-1 text-sm text-destructive">
                  {errors.rating.message}
                </p>
              )}
            </fieldset>

            <div className="grid gap-2">
              <Label htmlFor="review-text">{t("text")}</Label>
              <Textarea
                id="review-text"
                rows={4}
                maxLength={MAX_TEXT}
                placeholder={t("textPlaceholder")}
                aria-invalid={Boolean(errors.text)}
                aria-describedby="review-text-counter"
                {...form.register("text")}
              />
              <p id="review-text-counter" className="text-right text-xs text-muted-foreground">
                {errors.text?.message ?? t("counter", { count: text.length })}
              </p>
            </div>

            {errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {errors.root.message}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={create.isPending}>
              {create.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {t("submit")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
