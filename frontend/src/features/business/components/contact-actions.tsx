"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Navigation, Phone, Send, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BusinessDetail } from "@/lib/api/types";
import { googleDirectionsUrl, yandexDirectionsUrl } from "@/lib/directions";
import { formatPhone, telHref } from "@/lib/format/phone";
import { trackEvent } from "@/lib/track";

type Props = Pick<BusinessDetail, "id" | "name" | "phones" | "telegram" | "location">;

/**
 * Asosiy amallar: qo'ng'iroq, Telegram, yo'l ko'rsatish, ulashish.
 * Har bir bosish statistikaga yoziladi (biznes egasiga ko'rsatiladigan raqamlar uchun).
 */
export function ContactActions({ id, name, phones, telegram, location }: Props) {
  const t = useTranslations("BusinessPage");
  const phone = phones[0];

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (error) {
        // Foydalanuvchi bekor qildi — hech narsa qilmaymiz
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("linkCopied"));
    } catch {
      toast.error(url);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {phone && (
        <Button asChild size="lg" className="col-span-2 sm:col-span-1">
          <a href={telHref(phone.number)} onClick={() => trackEvent("call_click", id)}>
            <Phone aria-hidden="true" />
            {t("call")}
            <span className="font-normal tabular-nums opacity-90">{formatPhone(phone.number)}</span>
          </a>
        </Button>
      )}

      {telegram && (
        <Button asChild size="lg" variant="outline">
          <a
            href={`https://t.me/${encodeURIComponent(telegram)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent("telegram_click", id)}
          >
            <Send aria-hidden="true" />
            {t("telegram")}
          </a>
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="lg" variant="outline">
            <Navigation aria-hidden="true" />
            {t("directions")}
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild>
            <a
              href={yandexDirectionsUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("direction_click", id)}
            >
              {t("directionsYandex")}
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={googleDirectionsUrl(location)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("direction_click", id)}
            >
              {t("directionsGoogle")}
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <FavoriteButton businessId={id} businessName={name} variant="button" />

      <Button size="lg" variant="outline" onClick={share}>
        <Share2 aria-hidden="true" />
        {t("share")}
      </Button>
    </div>
  );
}

/** Profil ko'rilganini bir marta yozadi */
export function TrackProfileView({ businessId }: { businessId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackEvent("profile_view", businessId);
  }, [businessId]);
  return null;
}
