"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/common/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { browserApi, BrowserApiError, call } from "@/lib/api/browser";
import { useHydrated } from "@/lib/use-hydrated";
import { adminMeKey } from "../use-admin";

function errorMessage(
  error: unknown,
  t: ReturnType<typeof useTranslations<"Admin.login">>,
): string {
  if (error instanceof BrowserApiError) {
    if (error.status === 429) return t("errors.tooMany");
    if (error.body?.code === "invalid_code") return t("errors.code");
    if (error.body?.code === "challenge_expired") return t("errors.expired");
    if (error.status === 401) return t("errors.invalid");
  }
  return t("errors.generic");
}

/** Ikki bosqichli kirish: login + parol → TOTP kodi (ADR-0006) */
export function AdminLogin({ next, demoMode }: { next: string; demoMode: boolean }) {
  const t = useTranslations("Admin.login");
  const router = useRouter();
  const queryClient = useQueryClient();
  const hydrated = useHydrated();
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      call(browserApi.POST("/admin/auth/login", { body: credentials })),
    onSuccess: ({ challengeToken }) => {
      setFormError(null);
      setChallenge(challengeToken);
    },
    onError: (error) => setFormError(errorMessage(error, t)),
  });

  const verify = useMutation({
    mutationFn: () =>
      call(browserApi.POST("/admin/auth/2fa", { body: { challengeToken: challenge ?? "", code } })),
    onSuccess: (admin) => {
      queryClient.setQueryData(adminMeKey, admin);
      router.replace(next);
      router.refresh();
    },
    onError: (error) => {
      setFormError(errorMessage(error, t));
      setCode("");
      // Muddati o'tgan yoki urinishlar tugagan — birinchi qadamga
      if (
        error instanceof BrowserApiError &&
        (error.status === 429 || error.body?.code === "challenge_expired")
      ) {
        setChallenge(null);
      }
    },
  });

  return (
    <div className="mx-auto w-full max-w-sm space-y-6">
      <div className="flex justify-center">
        <Logo />
      </div>

      {!challenge ? (
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
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!hydrated || login.isPending}
          >
            {login.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {t("submit")}
          </Button>
        </form>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!/^\d{6}$/.test(code)) {
              setFormError(t("errors.codeFormat"));
              return;
            }
            verify.mutate();
          }}
        >
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
            {t("codeTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("codeDescription")}</p>
          <div className="grid gap-2">
            <Label htmlFor="admin-code">{t("code")}</Label>
            <Input
              id="admin-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              className="text-center text-lg tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={verify.isPending}>
            {verify.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {t("verify")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setChallenge(null);
              setFormError(null);
            }}
          >
            {t("back")}
          </Button>
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
