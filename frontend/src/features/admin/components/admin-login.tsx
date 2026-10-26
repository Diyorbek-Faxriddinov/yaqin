"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/common/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { browserApi, BrowserApiError, call } from "@/lib/api/browser";
import type { AdminTotpSetup } from "@/lib/api/types";
import { useHydrated } from "@/lib/use-hydrated";
import { adminMeKey } from "../use-admin";

const MIN_PASSWORD_LENGTH = 12;

type Step =
  | { kind: "credentials" }
  // Birinchi kirish yoki tiklangan akkaunt: vaqtinchalik parol → o'zining paroli
  | { kind: "password"; token: string }
  // TOTP kodi; `setup` bo'lsa — avval autentifikator ilovaga kalit qo'shiladi
  | { kind: "code"; token: string; setup: AdminTotpSetup | null };

function errorMessage(
  error: unknown,
  t: ReturnType<typeof useTranslations<"Admin.login">>,
): string {
  if (error instanceof BrowserApiError) {
    if (error.status === 429) return t("errors.tooMany");
    if (error.body?.code === "invalid_code") return t("errors.code");
    if (["challenge_expired", "setup_required"].includes(error.body?.code ?? "")) {
      return t("errors.expired");
    }
    if (error.status === 401) return t("errors.invalid");
  }
  return t("errors.generic");
}

/** Muddati o'tgan, urinishlar tugagan yoki holat o'zgargan — birinchi qadamdan qayta */
function mustRestart(error: unknown): boolean {
  return error instanceof BrowserApiError && [401, 409, 429].includes(error.status);
}

/** Kirish: login + parol → (birinchi marta: yangi parol, 2FA sozlash) → TOTP kodi (ADR-0006) */
export function AdminLogin({ next, demoMode }: { next: string; demoMode: boolean }) {
  const t = useTranslations("Admin.login");
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const [step, setStep] = useState<Step>({ kind: "credentials" });
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const restart = (message: string | null) => {
    setStep({ kind: "credentials" });
    setCode("");
    setFormError(message);
  };

  const setup = useMutation({
    mutationFn: (input: { token: string; newPassword: string | null }) =>
      call(
        browserApi.POST("/admin/auth/setup", {
          body: { challengeToken: input.token, newPassword: input.newPassword },
        }),
      ),
    onSuccess: (data, input) => {
      setFormError(null);
      setStep({ kind: "code", token: input.token, setup: data });
    },
    onError: (error) => {
      const passwordErrors =
        error instanceof BrowserApiError ? error.body?.fields?.newPassword : undefined;
      if (passwordErrors?.length) setFormError(passwordErrors.join(" "));
      else if (mustRestart(error)) restart(errorMessage(error, t));
      else setFormError(errorMessage(error, t));
    },
  });

  const login = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      call(browserApi.POST("/admin/auth/login", { body: credentials })),
    onSuccess: ({ challengeToken, next: nextStep, mustChangePassword }) => {
      setFormError(null);
      if (nextStep === "totp") setStep({ kind: "code", token: challengeToken, setup: null });
      else if (mustChangePassword) setStep({ kind: "password", token: challengeToken });
      // Parol o'zgarmaydi — darhol 2FA kaliti
      else setup.mutate({ token: challengeToken, newPassword: null });
    },
    onError: (error) => setFormError(errorMessage(error, t)),
  });

  const verify = useMutation({
    mutationFn: (token: string) =>
      call(browserApi.POST("/admin/auth/2fa", { body: { challengeToken: token, code } })),
    onSuccess: (admin) => {
      queryClient.setQueryData(adminMeKey, admin);
      router.replace(next);
      router.refresh();
    },
    onError: (error) => {
      setCode("");
      if (error instanceof BrowserApiError && error.body?.code === "invalid_code") {
        setFormError(errorMessage(error, t));
      } else if (mustRestart(error)) {
        restart(errorMessage(error, t));
      } else {
        setFormError(errorMessage(error, t));
      }
    },
  });

  const errorAlert = formError && (
    <p role="alert" className="text-sm text-destructive">
      {formError}
    </p>
  );
  const backButton = (
    <Button type="button" variant="ghost" className="w-full" onClick={() => restart(null)}>
      {t("back")}
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="flex justify-center">
        <Logo />
      </div>

      {step.kind === "credentials" && (
        // method="post": JavaScript yuklanmasdan yuborilsa ham parol URL'ga (tarix, loglar) tushmaydi.
        // Maydonlar boshqarilmaydigan — sahifa jonlanishidan oldin yozilgan matn yo'qolmaydi.
        <form
          method="post"
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const username = String(data.get("username") ?? "").trim();
            const password = String(data.get("password") ?? "");
            if (!username || !password) {
              setFormError(t("errors.required"));
              return;
            }
            login.mutate({ username, password });
          }}
        >
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <KeyRound aria-hidden="true" className="size-5 text-primary" />
            {t("title")}
          </h1>
          <div className="grid gap-2">
            <Label htmlFor="admin-username">{t("username")}</Label>
            <Input
              id="admin-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-password">{t("password")}</Label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
            />
          </div>
          {errorAlert}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!hydrated || login.isPending || setup.isPending}
          >
            {(login.isPending || setup.isPending) && (
              <Loader2 aria-hidden="true" className="animate-spin" />
            )}
            {t("submit")}
          </Button>
        </form>
      )}

      {step.kind === "password" && (
        <form
          method="post"
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const newPassword = String(data.get("newPassword") ?? "");
            if (newPassword.length < MIN_PASSWORD_LENGTH) {
              setFormError(t("errors.passwordShort"));
              return;
            }
            if (newPassword !== String(data.get("confirmPassword") ?? "")) {
              setFormError(t("errors.passwordMismatch"));
              return;
            }
            setup.mutate({ token: step.token, newPassword });
          }}
        >
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <LockKeyhole aria-hidden="true" className="size-5 text-primary" />
            {t("setupTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("setupDescription")}</p>
          <div className="grid gap-2">
            <Label htmlFor="admin-new-password">{t("newPassword")}</Label>
            <Input
              id="admin-new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              aria-describedby="admin-new-password-hint"
              autoFocus
            />
            <p id="admin-new-password-hint" className="text-xs text-muted-foreground">
              {t("newPasswordHint")}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="admin-confirm-password">{t("confirmPassword")}</Label>
            <Input
              id="admin-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
            />
          </div>
          {errorAlert}
          <Button type="submit" size="lg" className="w-full" disabled={setup.isPending}>
            {setup.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {t("submit")}
          </Button>
          {backButton}
        </form>
      )}

      {step.kind === "code" && (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!/^\d{6}$/.test(code)) {
              setFormError(t("errors.codeFormat"));
              return;
            }
            verify.mutate(step.token);
          }}
        >
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
            {step.setup ? t("totpTitle") : t("codeTitle")}
          </h1>
          {step.setup ? (
            <>
              <p className="text-sm text-muted-foreground">{t("totpDescription")}</p>
              {/* QR — backend yaratgan SVG (data URI); next/image kerak emas */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={step.setup.qrDataUri}
                alt={t("qrAlt")}
                width={192}
                height={192}
                className="mx-auto rounded-md bg-white p-2"
              />
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">{t("secretLabel")}</p>
                <code className="block rounded-md bg-muted px-3 py-2 font-mono break-all select-all">
                  {step.setup.secret}
                </code>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("codeDescription")}</p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="admin-code">{t("code")}</Label>
            <Input
              id="admin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus={!step.setup}
              className="text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          {errorAlert}
          <Button type="submit" size="lg" className="w-full" disabled={verify.isPending}>
            {verify.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {t("verify")}
          </Button>
          {backButton}
        </form>
      )}

      {demoMode && (
        <Alert>
          <AlertDescription>
            {t.rich("demoHint", { b: (chunks) => <strong>{chunks}</strong> })}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
