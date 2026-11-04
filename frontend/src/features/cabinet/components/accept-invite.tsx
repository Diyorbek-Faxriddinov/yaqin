"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loginHref, useMe } from "@/features/auth/use-me";
import { Link, useRouter } from "@/i18n/navigation";
import { BrowserApiError } from "@/lib/api/browser";
import { useAcceptInvite } from "../use-cabinet";

const STORAGE_KEY = "yaqin.ownerInvite";
const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

/**
 * Token URL fragmentidan (`#...`) olinadi va darhol manzildan o'chiriladi (tarixda, ekran
 * rasmlarida qolmasin). Kirish kerak bo'lsa — sessionStorage'da kutadi: /kirish?next= fragmentni
 * olib o'tmaydi. Saqlab bo'lmasa (maxfiy rejim) — faqat shu sahifa davomida.
 */
function readToken(): string | null {
  const fromHash = window.location.hash.slice(1);
  if (TOKEN.test(fromHash)) {
    try {
      sessionStorage.setItem(STORAGE_KEY, fromHash);
    } catch {
      // saqlab bo'lmadi — token holatda qoladi
    }
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    return fromHash;
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored && TOKEN.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

function forgetToken() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // e'tiborsiz
  }
}

export function AcceptInvite() {
  const t = useTranslations("Cabinet.accept");
  const router = useRouter();
  const { data: me, isPending } = useMe();
  const accept = useAcceptInvite();
  // undefined — hali o'qilmagan (birinchi render serverda ham bir xil bo'lishi uchun)
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [failure, setFailure] = useState<"invalid" | "ownerLimit" | "error" | null>(null);

  useEffect(() => {
    // Fragment faqat brauzerda bor — holat effektda bir marta o'rnatiladi
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(readToken());
  }, []);

  const submit = () => {
    if (!token) return;
    setFailure(null);
    accept.mutate(token, {
      onSuccess: (business) => {
        forgetToken();
        toast.success(t("done", { name: business.name }));
        router.replace(`/kabinet/${business.id}`);
      },
      onError: (error) => {
        if (error instanceof BrowserApiError && error.status === 404) {
          forgetToken();
          setFailure("invalid");
        } else if (error instanceof BrowserApiError && error.body?.code === "owner_limit") {
          setFailure("ownerLimit");
        } else {
          setFailure("error");
        }
      },
    });
  };

  if (token === undefined || isPending) return <Skeleton className="h-64" />;

  return (
    <section className="space-y-5 rounded-2xl border p-5 sm:p-6">
      <div className="space-y-2">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          <KeyRound aria-hidden="true" className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {!token ? (
        <Alert variant="destructive">
          <AlertDescription>{t("noToken")}</AlertDescription>
        </Alert>
      ) : !me ? (
        <div className="space-y-3">
          <p className="text-sm">{t("loginFirst")}</p>
          <Button asChild size="lg">
            <Link href={loginHref("/kabinet/qoshilish")}>
              <LogIn aria-hidden="true" />
              {t("login")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">{t("as", { name: me.displayName })}</p>
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{t(failure)}</AlertDescription>
            </Alert>
          )}
          {failure !== "invalid" && (
            <p className="text-sm text-muted-foreground">
              {t.rich("terms", {
                terms: (chunks) => (
                  <Link href="/shartlar#kabinet" className="underline underline-offset-4">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          )}
          {failure !== "invalid" && (
            <Button size="lg" onClick={submit} disabled={accept.isPending}>
              {accept.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {t("button")}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
