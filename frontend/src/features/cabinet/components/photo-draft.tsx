"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, Camera, Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrowserApiError } from "@/lib/api/browser";
import { cn } from "@/lib/utils";
import type { DraftPhoto } from "../photo-refs";
import { uploadChangePhoto } from "../use-cabinet";

/**
 * Biznes egasi uchun rasmlar: yangi rasm darhol yuklanadi (saytda ko'rinmaydi), lekin ro'yxat —
 * tartib, o'chirish, qo'shish — faqat taklif yuborilganda moderatorga ketadi.
 */
export function PhotoDraft({
  inputId,
  businessId,
  photos,
  onChange,
  max,
  firstLabel,
  limitMessage,
  compact = false,
  onUploadingChange,
}: {
  /** Fayl tanlash maydoni (E2E testlar shu orqali fayl beradi) */
  inputId: string;
  businessId: string;
  photos: DraftPhoto[];
  onChange: Dispatch<SetStateAction<DraftPhoto[]>>;
  max: number;
  firstLabel: string;
  limitMessage: string;
  /** Dialog ichida — ixchamroq to'r */
  compact?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const t = useTranslations("Admin");
  const tCabinet = useTranslations("Cabinet");
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  useEffect(() => onUploadingChange?.(uploading > 0), [uploading, onUploadingChange]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = max - photos.length - uploading;
    const selected = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > room) toast.error(limitMessage);
    setUploading((n) => n + selected.length);
    // Ketma-ket — sekin mobil internetda parallel yuklash hammasini sekinlashtiradi
    for (const file of selected) {
      try {
        const upload = await uploadChangePhoto(businessId, file);
        onChange((current) => [
          ...current,
          { key: upload.id, uploadId: upload.id, url: upload.previewUrl, alt: null },
        ]);
      } catch (error) {
        toast.error(
          error instanceof BrowserApiError && error.body?.code === "too_many_uploads"
            ? tCabinet("photos.tooMany")
            : t("photos.uploadError"),
        );
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (index: number, delta: number) =>
    onChange((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });

  return (
    <div className="space-y-3">
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
        disabled={photos.length + uploading >= max}
        onClick={() => inputRef.current?.click()}
      >
        <Camera aria-hidden="true" />
        {t("photos.add")}
      </Button>

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
            <li key={photo.key} className="overflow-hidden rounded-xl border">
              <div className={cn("relative bg-muted", compact ? "aspect-square" : "aspect-[4/3]")}>
                {/* eslint-disable-next-line @next/next/no-img-element -- yuklangan rasm sessiya bilan ko'rinadi, optimallashtirilmaydi */}
                <img src={photo.url} alt={photo.alt ?? ""} className="size-full object-cover" />
                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                  {index === 0 && <Badge>{firstLabel}</Badge>}
                  {"uploadId" in photo && (
                    <Badge variant="secondary">{tCabinet("photos.new")}</Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-between p-1">
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("photos.moveUp")}
                    disabled={index === 0}
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
                      disabled={index === photos.length - 1}
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
                  onClick={() => onChange((current) => current.filter((p) => p.key !== photo.key))}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
