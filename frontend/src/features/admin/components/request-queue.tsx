"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Loader2, Phone, PhoneCall, RotateCcw, Store, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link, useRouter } from "@/i18n/navigation";
import type { AdminBusinessRequest } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { formatPhone, telHref } from "@/lib/format/phone";
import { cn } from "@/lib/utils";
import { REQUEST_FILTERS, type RequestFilter } from "../admin-params";
import { applyServerErrors, useCatalogOptions } from "../use-admin-business";
import { useConvertRequest, useRequestQueue, useUpdateRequest } from "../use-moderation";
import { FilterChips, useUrlFilter } from "./filter-chips";
import { NoteDialog } from "./note-dialog";
import { PagedList } from "./paged-list";

const STATUS_TONE: Record<AdminBusinessRequest["status"], string> = {
  new: "bg-warning-soft text-warning",
  contacted: "bg-primary-soft text-primary-soft-foreground",
  converted: "bg-success-soft text-success",
  rejected: "bg-muted text-muted-foreground",
};

/** So'rovdan qoralama: nom, kategoriya, tuman tasdiqlanadi; keyin usta joylashuv qadamidan davom etadi */
function ConvertDialog({
  request,
  onOpenChange,
}: {
  request: AdminBusinessRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const { categories, districts } = useCatalogOptions();
  const convert = useConvertRequest();

  const schema = z.object({
    name: z.string().trim().min(2, t("validation.nameLength")).max(120, t("validation.nameLength")),
    categorySlug: z.string().min(1, t("validation.category")),
    districtSlug: z.string().min(1, t("validation.district")),
  });
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: request?.businessName ?? "",
      categorySlug: "",
      districtSlug: request?.district?.slug ?? "",
    },
  });
  const errors = form.formState.errors;

  return (
    <Dialog open={request !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("requests.convertTitle")}</DialogTitle>
          <DialogDescription>{t("requests.convertDescription")}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit(
            (values) =>
              request &&
              convert.mutate(
                { id: request.id, body: values },
                {
                  onSuccess: (business) => {
                    toast.success(t("requests.convertedToast"));
                    // Ustaning 2-qadami — joylashuv (joyiga borganda)
                    router.push(`/admin/bizneslar/yangi?id=${business.id}&qadam=2`);
                  },
                  onError: (error) => {
                    if (
                      !applyServerErrors(form, error, {
                        name: "name",
                        categorySlug: "categorySlug",
                        districtSlug: "districtSlug",
                      })
                    ) {
                      toast.error(t("requests.error"));
                    }
                  },
                },
              ),
          )}
        >
          {request?.activity && (
            <p className="rounded-lg bg-muted p-3 text-sm">
              {t("requests.activity", { activity: request.activity })}
            </p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="convert-name">{t("basic.name")}</Label>
            <Input
              id="convert-name"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "convert-name-error" : undefined}
              {...form.register("name")}
            />
            {errors.name && (
              <p id="convert-name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="convert-category">{t("basic.category")}</Label>
            <Controller
              control={form.control}
              name="categorySlug"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="convert-category"
                    className="w-full"
                    aria-invalid={Boolean(errors.categorySlug)}
                    aria-describedby={errors.categorySlug ? "convert-category-error" : undefined}
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
            {errors.categorySlug && (
              <p id="convert-category-error" className="text-sm text-destructive">
                {errors.categorySlug.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="convert-district">{t("basic.district")}</Label>
            <Controller
              control={form.control}
              name="districtSlug"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="convert-district"
                    className="w-full"
                    aria-invalid={Boolean(errors.districtSlug)}
                    aria-describedby={errors.districtSlug ? "convert-district-error" : undefined}
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
            {errors.districtSlug && (
              <p id="convert-district-error" className="text-sm text-destructive">
                {errors.districtSlug.message}
              </p>
            )}
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={convert.isPending}>
            {convert.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {t("requests.convert")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type NoteAction = { request: AdminBusinessRequest; status: "contacted" | "rejected" };

/** "Biznesingizni qo'shing" so'rovlari: bog'lanish, rad etish yoki biznes qoralamasini yaratish */
export function RequestQueue({ initialFilter }: { initialFilter: RequestFilter }) {
  const t = useTranslations("Admin.requests");
  const locale = useLocale();
  const [filter, setFilter] = useUrlFilter(initialFilter, "new");
  const list = useRequestQueue(filter);
  const update = useUpdateRequest();
  const [converting, setConverting] = useState<AdminBusinessRequest | null>(null);
  const [noting, setNoting] = useState<NoteAction | null>(null);

  const reopen = (request: AdminBusinessRequest) =>
    update.mutate(
      { id: request.id, status: "new" },
      {
        onSuccess: () => toast.success(t("reopenedToast")),
        onError: () => toast.error(t("error")),
      },
    );

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <FilterChips
        label={t("filterLabel")}
        options={REQUEST_FILTERS}
        value={filter}
        onChange={setFilter}
        getLabel={(value) => t(`status.${value}`)}
      />

      <PagedList
        query={list}
        countLabel={(count) => t("count", { count })}
        emptyTitle={filter === "new" ? t("emptyQueue") : t("empty")}
        renderItem={(request) => {
          const open = request.status === "new" || request.status === "contacted";
          return (
            <article className="space-y-3 rounded-xl border p-4">
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-semibold">{request.businessName}</p>
                  <p className="text-sm text-muted-foreground">
                    {[request.activity, request.district?.name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <Badge className={cn("border-transparent", STATUS_TONE[request.status])}>
                  {t(`status.${request.status}`)}
                </Badge>
              </header>
              <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
                {request.address && (
                  <>
                    <dt className="text-muted-foreground">{t("address")}</dt>
                    <dd>{request.address}</dd>
                  </>
                )}
                <dt className="text-muted-foreground">{t("contact")}</dt>
                <dd className="flex flex-wrap items-center gap-x-2">
                  {request.contactName}
                  <a
                    href={telHref(request.phone)}
                    className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
                  >
                    <Phone aria-hidden="true" className="size-3.5" />
                    {formatPhone(request.phone)}
                  </a>
                </dd>
                <dt className="text-muted-foreground">{t("received")}</dt>
                <dd>
                  <time dateTime={request.createdAt}>{formatDate(request.createdAt, locale)}</time>
                </dd>
              </dl>
              {request.note && (
                <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">
                  {request.note}
                </p>
              )}
              {request.adminNote && (
                <p className="text-sm text-muted-foreground">
                  {t("adminNote", { note: request.adminNote })}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {open && (
                  <Button size="sm" onClick={() => setConverting(request)}>
                    <Store aria-hidden="true" />
                    {t("convert")}
                  </Button>
                )}
                {request.status === "new" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNoting({ request, status: "contacted" })}
                  >
                    <PhoneCall aria-hidden="true" />
                    {t("markContacted")}
                  </Button>
                )}
                {open && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setNoting({ request, status: "rejected" })}
                  >
                    <X aria-hidden="true" />
                    {t("reject")}
                  </Button>
                )}
                {request.status === "converted" && request.businessId && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/bizneslar/${request.businessId}`}>
                      {t("openBusiness")}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                )}
                {request.status === "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={update.isPending}
                    onClick={() => reopen(request)}
                  >
                    <RotateCcw aria-hidden="true" />
                    {t("reopen")}
                  </Button>
                )}
              </div>
            </article>
          );
        }}
      />

      <ConvertDialog request={converting} onOpenChange={(open) => !open && setConverting(null)} />

      <NoteDialog
        open={noting !== null}
        onOpenChange={(open) => !open && setNoting(null)}
        title={noting?.status === "rejected" ? t("rejectTitle") : t("contactedTitle")}
        label={t("noteLabel")}
        submitLabel={noting?.status === "rejected" ? t("reject") : t("save")}
        required={noting?.status === "rejected"}
        defaultValue={noting?.request.adminNote ?? ""}
        presets={noting?.status === "rejected" ? [t("presets.outside"), t("presets.online")] : []}
        maxLength={500}
        destructive={noting?.status === "rejected"}
        pending={update.isPending}
        onSubmit={(note) =>
          noting &&
          update.mutate(
            { id: noting.request.id, status: noting.status, adminNote: note || null },
            {
              onSuccess: () => {
                setNoting(null);
                toast.success(t("savedToast"));
              },
              onError: () => toast.error(t("error")),
            },
          )
        }
      />
    </div>
  );
}
