"use client";

import { useState } from "react";
import { Loader2, Plus, ShieldCheck, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BrowserApiError } from "@/lib/api/browser";
import type { AdminBusinessUpdate } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { formatPhone, normalizeUzPhone } from "@/lib/format/phone";
import { useUpdateBusiness } from "../../use-admin-business";
import type { SectionProps } from "./section-props";

const TELEGRAM = /^[A-Za-z0-9_]{5,32}$/;
const INSTAGRAM = /^[A-Za-z0-9_.]{1,30}$/;
const today = () => new Date().toISOString().slice(0, 10);

export function ContactsSection({ business, canEdit, submitLabel, onDone }: SectionProps) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const update = useUpdateBusiness(business.id);
  const [phones, setPhones] = useState<string[]>(
    business.phones.length ? business.phones.map((p) => formatPhone(p.number)) : [""],
  );
  const [telegram, setTelegram] = useState(business.telegram ?? "");
  const [instagram, setInstagram] = useState(business.instagram ?? "");
  const [consentRemoved, setConsentRemoved] = useState(false);
  const [givenBy, setGivenBy] = useState("");
  const [givenAt, setGivenAt] = useState(today);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const existingConsent = consentRemoved ? null : business.consent;

  const save = () => {
    const next: Record<string, string> = {};
    const normalized = phones
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => normalizeUzPhone(p));
    if (normalized.some((p) => p === null)) next.phones = t("contacts.phoneInvalid");
    const tg = telegram.trim().replace(/^@/, "");
    const ig = instagram.trim().replace(/^@/, "");
    if (tg && !TELEGRAM.test(tg)) next.telegram = t("validation.telegram");
    if (ig && !INSTAGRAM.test(ig)) next.instagram = t("validation.instagram");
    if (!existingConsent && givenBy.trim() && givenBy.trim().length < 2)
      next.givenBy = t("validation.givenBy");
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const body: AdminBusinessUpdate = {
      phones: (normalized as string[]).map((number) => ({ number, label: null })),
      telegram: tg || null,
      instagram: ig || null,
    };
    if (!existingConsent && givenBy.trim()) {
      body.consent = {
        givenBy: givenBy.trim(),
        givenAt: new Date(`${givenAt}T12:00:00+05:00`).toISOString(),
        note: note.trim() || null,
      };
    } else if (consentRemoved) {
      body.consent = null;
    }

    update.mutate(body, {
      onSuccess: () => {
        setConsentRemoved(false);
        setGivenBy("");
        setNote("");
        onDone();
      },
      onError: (error) => {
        const fields = error instanceof BrowserApiError ? error.body?.fields : undefined;
        if (fields) {
          setErrors(
            Object.fromEntries(
              Object.entries(fields).map(([key, messages]) => [key, messages[0] ?? ""]),
            ),
          );
        }
        toast.error(t("edit.saveError"));
      },
    });
  };

  return (
    <div className="space-y-6">
      <fieldset disabled={!canEdit} className="space-y-5">
        <div className="space-y-2">
          <p id="phones-label" className="text-sm font-medium">
            {t("contacts.phones")}
          </p>
          {phones.map((phone, index) => (
            <div key={index} className="flex gap-2">
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                aria-labelledby="phones-label"
                placeholder={t("contacts.phonePlaceholder")}
                value={phone}
                aria-invalid={Boolean(errors.phones)}
                aria-describedby={errors.phones ? "phones-error" : undefined}
                onChange={(e) =>
                  setPhones((list) => list.map((p, i) => (i === index ? e.target.value : p)))
                }
              />
              {phones.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("contacts.removePhone")}
                  onClick={() => setPhones((list) => list.filter((_, i) => i !== index))}
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </div>
          ))}
          {errors.phones && (
            <p id="phones-error" className="text-sm text-destructive">
              {errors.phones}
            </p>
          )}
          {phones.length < 5 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2"
              onClick={() => setPhones((l) => [...l, ""])}
            >
              <Plus aria-hidden="true" />
              {t("contacts.addPhone")}
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="business-telegram">{t("contacts.telegram")}</Label>
            <Input
              id="business-telegram"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={t("contacts.telegramPlaceholder")}
              value={telegram}
              aria-invalid={Boolean(errors.telegram)}
              aria-describedby={errors.telegram ? "telegram-error" : undefined}
              onChange={(e) => setTelegram(e.target.value)}
            />
            {errors.telegram && (
              <p id="telegram-error" className="text-sm text-destructive">
                {errors.telegram}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="business-instagram">{t("contacts.instagram")}</Label>
            <Input
              id="business-instagram"
              autoCapitalize="none"
              spellCheck={false}
              value={instagram}
              aria-invalid={Boolean(errors.instagram)}
              aria-describedby={errors.instagram ? "instagram-error" : undefined}
              onChange={(e) => setInstagram(e.target.value)}
            />
            {errors.instagram && (
              <p id="instagram-error" className="text-sm text-destructive">
                {errors.instagram}
              </p>
            )}
          </div>
        </div>

        <section aria-labelledby="consent-title" className="space-y-3 rounded-xl border p-4">
          <h3 id="consent-title" className="flex items-center gap-2 font-semibold">
            <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
            {t("consent.title")}
          </h3>
          {existingConsent ? (
            <div className="space-y-2">
              <p className="text-sm text-success">
                {t("consent.recorded", {
                  name: existingConsent.givenBy,
                  date: formatDate(existingConsent.givenAt, locale),
                })}
              </p>
              {existingConsent.note && (
                <p className="text-sm text-muted-foreground">{existingConsent.note}</p>
              )}
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 text-destructive"
                  onClick={() => setConsentRemoved(true)}
                >
                  {t("consent.remove")}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("consent.description")}</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="grid gap-2">
                  <Label htmlFor="consent-given-by">{t("consent.givenBy")}</Label>
                  <Input
                    id="consent-given-by"
                    placeholder={t("consent.givenByPlaceholder")}
                    value={givenBy}
                    maxLength={100}
                    aria-invalid={Boolean(errors.givenBy || errors.consent)}
                    onChange={(e) => setGivenBy(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="consent-given-at">{t("consent.givenAt")}</Label>
                  <Input
                    id="consent-given-at"
                    type="date"
                    value={givenAt}
                    max={today()}
                    onChange={(e) => setGivenAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="consent-note">{t("consent.note")}</Label>
                <Textarea
                  id="consent-note"
                  rows={2}
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              {(errors.givenBy || errors.consent) && (
                <p className="text-sm text-destructive">{errors.givenBy || errors.consent}</p>
              )}
            </div>
          )}
        </section>
      </fieldset>

      {canEdit && (
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={save}
          disabled={update.isPending}
        >
          {update.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
