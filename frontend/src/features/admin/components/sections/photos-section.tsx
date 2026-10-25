"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Camera, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { browserApi, BrowserApiError, call, csrfHeaders } from "@/lib/api/browser";
import type { AdminPhoto, ApiError } from "@/lib/api/types";
import { compressImage } from "@/lib/image/compress";
import { useRefreshBusiness } from "../../use-admin-business";
import type { SectionProps } from "./section-props";

const MAX_PHOTOS = 12;

async function uploadPhoto(businessId: string, file: File, alt: string): Promise<AdminPhoto> {
  const { blob, width, height } = await compressImage(file);
  const form = new FormData();
  form.set("file", blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
  form.set("width", String(width));
  form.set("height", String(height));
  form.set("alt", alt);
  const response = await fetch(`/api/v1/admin/businesses/${businessId}/photos`, {
    method: "POST",
    body: form,
    headers: csrfHeaders(),
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new BrowserApiError(
      response.status,
      (await response.json().catch(() => undefined)) as ApiError | undefined,
    );
  }
  return (await response.json()) as AdminPhoto;
}

/** Rasmlar darhol yuklanadi/o'chiriladi (alohida "Saqlash" yo'q) — do'konda internet uzilsa ham yo'qolmaydi */
export function PhotosSection({ business, canEdit, submitLabel, onDone }: SectionProps) {
  const t = useTranslations("Admin");
  const refresh = useRefreshBusiness(business.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const photos = business.photos;

  const reorder = useMutation({
    mutationFn: (photoIds: string[]) =>
      call(
        browserApi.PUT("/admin/businesses/{businessId}/photos/order", {
          params: { path: { businessId: business.id } },
          body: { photoIds },
        }),
      ),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: (photoId: string) =>
      call(
        browserApi.DELETE("/admin/businesses/{businessId}/photos/{photoId}", {
          params: { path: { businessId: business.id, photoId } },
        }),
      ),
    onSettled: refresh,
  });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const selected = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) toast.error(t("photos.limit"));
    setUploading((n) => n + selected.length);
    // Ketma-ket — sekin mobil internetda parallel yuklash hammasini sekinlashtiradi
    for (const [index, file] of selected.entries()) {
      try {
        await uploadPhoto(
          business.id,
          file,
          t("photos.alt", { name: business.name, index: photos.length + index + 1 }),
        );
      } catch {
        toast.error(t("photos.uploadError"));
      } finally {
        setUploading((n) => n - 1);
        refresh();
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (index: number, delta: number) => {
    const ids = photos.map((p) => p.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate(ids);
  };

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="space-y-2">
          <input
            ref={inputRef}
            id="photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => void onFiles(e.target.files)}
          />
          <Button
            type="button"
            size="lg"
            variant="secondary"
            disabled={photos.length >= MAX_PHOTOS}
            onClick={() => inputRef.current?.click()}
          >
            <Camera aria-hidden="true" />
            {t("photos.add")}
          </Button>
          <p className="text-sm text-muted-foreground">{t("photos.addHint")}</p>
        </div>
      )}

      {uploading > 0 && (
        <p role="status" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {t("photos.uploading")} ({uploading})
        </p>
      )}

      {photos.length === 0 && uploading === 0 ? (
        <p className="text-sm text-muted-foreground">{t("photos.empty")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) => (
            <li key={photo.id} className="overflow-hidden rounded-xl border">
              <div className="relative aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin oldindan ko'rish, optimallashtirish shart emas */}
                <img src={photo.url} alt={photo.alt ?? ""} className="size-full object-cover" />
                {index === 0 && (
                  <Badge className="absolute top-2 left-2">{t("photos.cover")}</Badge>
                )}
              </div>
              {canEdit && (
                <div className="flex justify-between p-1">
                  <div className="flex">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("photos.moveUp")}
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowLeft aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("photos.moveDown")}
                      disabled={index === photos.length - 1 || reorder.isPending}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("photos.delete")}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(photo.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onDone}
          disabled={uploading > 0}
        >
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
