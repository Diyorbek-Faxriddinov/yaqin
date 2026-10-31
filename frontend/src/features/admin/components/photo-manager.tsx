"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Camera, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrowserApiError, csrfHeaders } from "@/lib/api/browser";
import type { AdminPhoto, ApiError } from "@/lib/api/types";
import { compressImage } from "@/lib/image/compress";
import { cn } from "@/lib/utils";

/** Rasmni brauzerda kichraytirib yuklaydi (biznes va mahsulot rasmlari uchun umumiy) */
export async function uploadPhoto(url: string, file: File, alt: string): Promise<AdminPhoto> {
  const { blob, width, height } = await compressImage(file);
  const form = new FormData();
  form.set("file", blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
  form.set("width", String(width));
  form.set("height", String(height));
  form.set("alt", alt);
  const response = await fetch(url, {
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

/**
 * Rasmlar darhol yuklanadi/o'chiriladi (alohida "Saqlash" yo'q) — do'konda internet uzilsa ham
 * yo'qolmaydi. Birinchi rasm — muqova (biznes) yoki asosiy rasm (mahsulot).
 */
export function PhotoManager({
  inputId,
  photos,
  max,
  canEdit,
  uploadUrl,
  altFor,
  firstLabel,
  limitMessage,
  reorder,
  remove,
  onChanged,
  compact = false,
  onUploadingChange,
}: {
  /** Fayl tanlash maydoni (E2E testlar shu orqali fayl beradi) */
  inputId: string;
  photos: AdminPhoto[];
  max: number;
  canEdit: boolean;
  /** POST manzili (`/api/v1/admin/...`) */
  uploadUrl: string;
  /** Yangi rasmning alt matni (tartib raqami 1 dan) */
  altFor: (index: number) => string;
  firstLabel: string;
  limitMessage: string;
  reorder: (photoIds: string[]) => Promise<unknown>;
  remove: (photoId: string) => Promise<unknown>;
  onChanged: () => void;
  /** Dialog ichida — ixchamroq to'r */
  compact?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const t = useTranslations("Admin");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  useEffect(() => onUploadingChange?.(uploading > 0), [uploading, onUploadingChange]);

  const reorderMutation = useMutation({ mutationFn: reorder, onSettled: onChanged });
  const removeMutation = useMutation({ mutationFn: remove, onSettled: onChanged });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = max - photos.length;
    const selected = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) toast.error(limitMessage);
    setUploading((n) => n + selected.length);
    // Ketma-ket — sekin mobil internetda parallel yuklash hammasini sekinlashtiradi
    for (const [index, file] of selected.entries()) {
      try {
        await uploadPhoto(uploadUrl, file, altFor(photos.length + index + 1));
      } catch {
        toast.error(t("photos.uploadError"));
      } finally {
        setUploading((n) => n - 1);
        onChanged();
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (index: number, delta: number) => {
    const ids = photos.map((p) => p.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorderMutation.mutate(ids);
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void onFiles(e.target.files)}
          />
          <Button
            type="button"
            size={compact ? "default" : "lg"}
            variant="secondary"
            disabled={photos.length >= max}
            onClick={() => inputRef.current?.click()}
          >
            <Camera aria-hidden="true" />
            {t("photos.add")}
          </Button>
        </>
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
        <ul className={cn("grid gap-3", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
          {photos.map((photo, index) => (
            <li key={photo.id} className="overflow-hidden rounded-xl border">
              <div className={cn("relative bg-muted", compact ? "aspect-square" : "aspect-[4/3]")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- admin oldindan ko'rish, optimallashtirish shart emas */}
                <img src={photo.url} alt={photo.alt ?? ""} className="size-full object-cover" />
                {index === 0 && <Badge className="absolute top-2 left-2">{firstLabel}</Badge>}
              </div>
              {canEdit && (
                <div className="flex justify-between p-1">
                  <div className="flex">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("photos.moveUp")}
                      disabled={index === 0 || reorderMutation.isPending}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowLeft aria-hidden="true" />
                    </Button>
                    {!compact && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("photos.moveDown")}
                        disabled={index === photos.length - 1 || reorderMutation.isPending}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowRight aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("photos.delete")}
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(photo.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
