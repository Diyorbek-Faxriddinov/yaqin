"use client";

import { AtSign, Globe, Phone, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BusinessDetail } from "@/lib/api/types";
import { formatPhone, telHref } from "@/lib/format/phone";
import { trackEvent } from "@/lib/track";

type Props = Pick<BusinessDetail, "id" | "phones" | "telegram" | "instagram" | "website">;

/** Sayt manzili ko'rinishi: "https://www.example.uz/" → "example.uz" */
function siteLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const path = pathname === "/" ? "" : pathname;
    return `${hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}

/**
 * Barcha aloqa kanallari: asosiy tugmalarda faqat birinchi telefon va Telegram bor — qolgan
 * raqamlar, Instagram va veb-sayt shu yerda.
 */
export function ContactList({ id, phones, telegram, instagram, website }: Props) {
  const t = useTranslations("BusinessPage");
  const link = "font-medium underline-offset-4 hover:underline break-all";

  return (
    <ul className="space-y-2">
      {phones.map((phone) => (
        <li key={phone.number} className="flex items-start gap-2">
          <Phone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            <a
              href={telHref(phone.number)}
              className={`${link} tabular-nums`}
              onClick={() => trackEvent("call_click", id)}
            >
              {formatPhone(phone.number)}
            </a>
            {phone.label && <span className="text-muted-foreground"> · {phone.label}</span>}
          </span>
        </li>
      ))}
      {telegram && (
        <li className="flex items-start gap-2">
          <Send aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <a
            href={`https://t.me/${encodeURIComponent(telegram)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={link}
            onClick={() => trackEvent("telegram_click", id)}
          >
            <span className="sr-only">{t("telegram")}: </span>@{telegram}
          </a>
        </li>
      )}
      {instagram && (
        <li className="flex items-start gap-2">
          <AtSign aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <a
            href={`https://www.instagram.com/${encodeURIComponent(instagram)}/`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={link}
          >
            <span className="sr-only">{t("instagram")}: </span>
            {instagram}
          </a>
        </li>
      )}
      {website && (
        <li className="flex items-start gap-2">
          <Globe aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <a href={website} target="_blank" rel="noopener noreferrer nofollow" className={link}>
            <span className="sr-only">{t("website")}: </span>
            {siteLabel(website)}
          </a>
        </li>
      )}
    </ul>
  );
}
