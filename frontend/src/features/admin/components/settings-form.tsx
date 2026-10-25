"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RetryButton } from "@/components/common/retry-button";
import { ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { BrowserApiError } from "@/lib/api/browser";
import type { PlatformSettings } from "@/lib/api/types";
import { normalizeUzPhone } from "@/lib/format/phone";
import { useSaveSettings, useSettings } from "../use-system";

const TELEGRAM = /^[A-Za-z0-9_]{5,32}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Errors = Partial<Record<"telegram" | "email" | "phone", string>>;

function SettingsFields({ initial }: { initial: PlatformSettings }) {
  const t = useTranslations("Admin.settings");
  const save = useSaveSettings();
  const [premoderation, setPremoderation] = useState(initial.reviewsPremoderation);
  const [requestsOpen, setRequestsOpen] = useState(initial.businessRequestsOpen);
  const [telegram, setTelegram] = useState(initial.contacts.telegram ?? "");
  const [email, setEmail] = useState(initial.contacts.email ?? "");
  const [phone, setPhone] = useState(initial.contacts.phone ?? "");
  const [errors, setErrors] = useState<Errors>({});

  const submit = () => {
    const next: Errors = {};
    const telegramValue = telegram.trim().replace(/^@/, "");
    const phoneValue = phone.trim() ? normalizeUzPhone(phone) : null;
    if (telegramValue && !TELEGRAM.test(telegramValue)) next.telegram = t("validation.telegram");
    if (email.trim() && !EMAIL.test(email.trim())) next.email = t("validation.email");
    if (phone.trim() && !phoneValue) next.phone = t("validation.phone");
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    save.mutate(
      {
        reviewsPremoderation: premoderation,
        businessRequestsOpen: requestsOpen,
        contacts: {
          telegram: telegramValue || null,
          email: email.trim() || null,
          phone: phoneValue,
        },
      },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (error) =>
          toast.error(error instanceof BrowserApiError ? error.message : t("error")),
      },
    );
  };

  const field = (
    key: keyof Errors,
    value: string,
    setValue: (value: string) => void,
    props: React.ComponentProps<typeof Input> = {},
  ) => (
    <div className="grid gap-2">
      <Label htmlFor={`settings-${key}`}>{t(`contacts.${key}`)}</Label>
      <Input
        id={`settings-${key}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `settings-${key}-error` : undefined}
        {...props}
      />
      {errors[key] && (
        <p id={`settings-${key}-error`} className="text-sm text-destructive">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <section aria-labelledby="settings-moderation" className="space-y-4 rounded-xl border p-4">
        <h2 id="settings-moderation" className="font-medium">
          {t("moderationTitle")}
        </h2>
        {(
          [
            ["premoderation", premoderation, setPremoderation],
            ["requestsOpen", requestsOpen, setRequestsOpen],
          ] as const
        ).map(([key, checked, setChecked]) => (
          <div key={key} className="flex items-start justify-between gap-4">
            <div className="grid gap-0.5">
              <Label htmlFor={`settings-${key}`}>{t(`${key}.label`)}</Label>
              <p id={`settings-${key}-hint`} className="text-sm text-muted-foreground">
                {t(`${key}.hint`)}
              </p>
            </div>
            <Switch
              id={`settings-${key}`}
              checked={checked}
              onCheckedChange={setChecked}
              aria-describedby={`settings-${key}-hint`}
            />
          </div>
        ))}
      </section>

      <section aria-labelledby="settings-contacts" className="space-y-4 rounded-xl border p-4">
        <div className="space-y-1">
          <h2 id="settings-contacts" className="font-medium">
            {t("contactsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("contactsHint")}</p>
        </div>
        {field("telegram", telegram, setTelegram, {
          placeholder: "yaqin_uz",
          autoCapitalize: "none",
          spellCheck: false,
        })}
        {field("email", email, setEmail, { type: "email", autoCapitalize: "none" })}
        {field("phone", phone, setPhone, {
          type: "tel",
          inputMode: "tel",
          placeholder: "90 123 45 67",
        })}
      </section>

      <Button type="submit" size="lg" disabled={save.isPending}>
        {save.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
        {t("save")}
      </Button>
    </form>
  );
}

/** Platforma sozlamalari (settings.manage): moderatsiya rejimi, so'rov formasi, kontaktlar */
export function SettingsForm() {
  const t = useTranslations("Admin.settings");
  const tStates = useTranslations("States");
  const { data, isPending, isError, refetch } = useSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {isPending ? (
        <Skeleton className="h-96" />
      ) : isError ? (
        <ErrorState
          title={tStates("errorTitle")}
          description={tStates("errorDescription")}
          action={<RetryButton onRetry={() => void refetch()} />}
        />
      ) : (
        <SettingsFields initial={data} />
      )}
    </div>
  );
}
