"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Image as ApiImage } from "@/lib/api/types";
import { isDemoMode } from "@/lib/env";
import { cn } from "@/lib/utils";

/**
 * Rasm hech qachon kesilmaydi: to'liq ko'rinadi (contain), bo'sh joyni shu rasmning xiralashtirilgan
 * nusxasi to'ldiradi — kvadrat yoki tik rasm ham keng blokda chiroyli turadi.
 */
function FittedImage({
  image,
  sizes,
  priority,
}: {
  image: ApiImage;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <>
      <Image
        src={image.url}
        alt=""
        aria-hidden="true"
        fill
        // Fon uchun kichik nusxa yetarli
        sizes="64px"
        unoptimized={isDemoMode}
        className="scale-110 object-cover opacity-60 blur-2xl"
      />
      <Image
        src={image.url}
        alt={image.alt ?? ""}
        fill
        sizes={sizes}
        unoptimized={isDemoMode}
        preload={priority}
        className="object-contain"
      />
    </>
  );
}

/**
 * Galereya: telefonda barmoq bilan suriladi (scroll-snap), desktopda tugmalar va kichik rasmlar;
 * bosilganda — to'liq ekranda. Rasm bo'lmasa — `placeholder` (kategoriya ikonkasi).
 */
export function MediaGallery({
  images,
  name,
  placeholder,
  className,
  priority = false,
}: {
  images: ApiImage[];
  /** Biznes yoki mahsulot nomi — ekran o'quvchi uchun */
  name: string;
  placeholder: React.ReactNode;
  /** Sahna balandligi, masalan "h-64 sm:h-96" */
  className?: string;
  /** Sahifaning asosiy rasmi (LCP) — oldindan yuklanadi */
  priority?: boolean;
}) {
  const t = useTranslations("Gallery");
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const total = images.length;

  if (total === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-primary-soft text-primary-soft-foreground/60",
          className,
        )}
      >
        {placeholder}
      </div>
    );
  }

  const scrollTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  };

  return (
    <div role="region" aria-label={t("region", { name })} className="space-y-2">
      <div className={cn("relative overflow-hidden rounded-2xl bg-muted", className)}>
        <div
          ref={trackRef}
          className="flex size-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const track = event.currentTarget;
            setCurrent(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
          }}
        >
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              className="relative size-full shrink-0 snap-center overflow-hidden focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
              aria-label={t("open", { index: index + 1, total })}
              onClick={() => setViewer(index)}
            >
              <FittedImage
                image={image}
                sizes="(min-width: 1152px) 1152px, 100vw"
                priority={priority && index === 0}
              />
            </button>
          ))}
        </div>

        {total > 1 && (
          <>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-1/2 left-2 hidden -translate-y-1/2 opacity-90 sm:inline-flex"
              aria-label={t("previous")}
              disabled={current === 0}
              onClick={() => scrollTo(current - 1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-1/2 right-2 hidden -translate-y-1/2 opacity-90 sm:inline-flex"
              aria-label={t("next")}
              disabled={current === total - 1}
              onClick={() => scrollTo(current + 1)}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <span
              aria-hidden="true"
              className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white tabular-nums"
            >
              {t("counter", { index: current + 1, total })}
            </span>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.url}
              type="button"
              aria-label={t("thumbnail", { index: index + 1 })}
              aria-current={index === current ? "true" : undefined}
              onClick={() => scrollTo(index)}
              className={cn(
                "relative size-14 shrink-0 overflow-hidden rounded-lg border-2 border-transparent opacity-70 transition-opacity hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                index === current && "border-primary opacity-100",
              )}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="56px"
                unoptimized={isDemoMode}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <Lightbox images={images} name={name} index={viewer} onIndexChange={setViewer} />
    </div>
  );
}

function Lightbox({
  images,
  name,
  index,
  onIndexChange,
}: {
  images: ApiImage[];
  name: string;
  index: number | null;
  onIndexChange: (index: number | null) => void;
}) {
  const t = useTranslations("Gallery");
  const total = images.length;
  const image = index != null ? images[index] : undefined;

  useEffect(() => {
    if (index == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && index < total - 1) onIndexChange(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, total, onIndexChange]);

  return (
    <Dialog open={image != null} onOpenChange={(open) => !open && onIndexChange(null)}>
      <DialogContent className="h-[90dvh] max-w-[calc(100%-1rem)] grid-rows-[auto_1fr] bg-black p-2 text-white sm:max-w-5xl">
        <DialogTitle className="pr-10 text-sm font-medium">
          {name}
          {total > 1 && index != null && (
            <span className="ml-2 font-normal text-white/70 tabular-nums">
              {t("counter", { index: index + 1, total })}
            </span>
          )}
        </DialogTitle>
        <DialogDescription className="sr-only">{t("region", { name })}</DialogDescription>
        {image && (
          <div className="relative min-h-0">
            <Image
              src={image.url}
              alt={image.alt ?? ""}
              fill
              sizes="(min-width: 1024px) 1024px, 100vw"
              unoptimized={isDemoMode}
              className="object-contain"
            />
            {total > 1 && index != null && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-1/2 left-1 -translate-y-1/2"
                  aria-label={t("previous")}
                  disabled={index === 0}
                  onClick={() => onIndexChange(index - 1)}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={t("next")}
                  disabled={index === total - 1}
                  onClick={() => onIndexChange(index + 1)}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
