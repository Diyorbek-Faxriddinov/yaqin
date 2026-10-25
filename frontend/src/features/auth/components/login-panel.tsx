"use client";

import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { browserApi, call } from "@/lib/api/browser";
import { meQueryKey, useMe } from "../use-me";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="currentColor"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
        opacity=".8"
      />
      <path
        fill="currentColor"
        d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14Z"
        opacity=".6"
      />
      <path
        fill="currentColor"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10C7.2 7.7 9.4 6 12 6Z"
        opacity=".9"
      />
    </svg>
  );
}

export function LoginPanel({ next, demoMode }: { next: string; demoMode: boolean }) {
  const t = useTranslations("Auth");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  // Allaqachon kirgan bo'lsa — qaytish manziliga
  useEffect(() => {
    if (me) router.replace(next);
  }, [me, next, router]);

  const demoLogin = useMutation({
    mutationFn: () => call(browserApi.POST("/auth/demo")),
    onSuccess: (user) => {
      queryClient.setQueryData(meQueryKey, user);
      router.replace(next);
      router.refresh();
    },
    onError: () => toast.error(t("loginError")),
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-3">
        {/* Haqiqiy provayderlar backend bilan birga ulanadi (4-bosqich) — ishlayotgandek ko'rsatilmaydi */}
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          disabled
          aria-describedby="providers-pending"
        >
          <Send aria-hidden="true" />
          {t("telegram")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full"
          disabled
          aria-describedby="providers-pending"
        >
          <GoogleIcon />
          {t("google")}
        </Button>
        <p id="providers-pending" className="text-center text-sm text-muted-foreground">
          {t("providersPending")}
        </p>
      </div>

      {demoMode && (
        <>
          <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              disabled={demoLogin.isPending}
              onClick={() => demoLogin.mutate()}
            >
              {demoLogin.isPending ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <UserRound aria-hidden="true" />
              )}
              {t("demo")}
            </Button>
            <Alert>
              <AlertDescription>{t("demoNote")}</AlertDescription>
            </Alert>
          </div>
        </>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {t.rich("consent", {
          terms: (chunks) => (
            <Link href="/shartlar" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/maxfiylik" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </div>
  );
}
