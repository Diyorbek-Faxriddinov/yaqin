"use client";

import { ExternalLink, PlayCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { linkPlatform } from "@/lib/item-link";
import { trackEvent } from "@/lib/track";
import { cn } from "@/lib/utils";

/**
 * Mahsulotning batafsil havolasi (Instagram, YouTube...): yangi oynada ochiladi, bosilishi
 * statistikada `link_click` boʻlib sanaladi. `compact` — roʻyxatdagi kichik tugma (kartadagi
 * havola ustida turadi, shuning uchun `relative z-10`).
 */
export function ItemLinkButton({
  url,
  businessId,
  compact = false,
  className,
}: {
  url: string;
  businessId: string;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("BusinessPage.item");
  const platform = linkPlatform(url);
  if (!platform) return null;
  const label = t(`links.${platform}`);

  return (
    <Button
      asChild
      variant="outline"
      size={compact ? "sm" : "lg"}
      className={cn(compact && "relative z-10 h-8 px-2.5 text-xs", className)}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        aria-label={`${label} (${t("newTab")})`}
        onClick={() => trackEvent("link_click", businessId)}
      >
        <PlayCircle aria-hidden="true" />
        {compact ? t(`platforms.${platform}`) : label}
        {!compact && <ExternalLink aria-hidden="true" className="opacity-70" />}
      </a>
    </Button>
  );
}
