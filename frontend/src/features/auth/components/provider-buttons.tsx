"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { TelegramAuth } from "@/lib/api/types";

/**
 * Rasmiy kirish vidjetlari (ADR-0006): Telegram Login Widget va Google Identity Services.
 * Skriptlar faqat kirish sahifasida va faqat sozlangan bo'lsa yuklanadi; imzo/ID token backendda
 * tekshiriladi — frontend hech narsaga ishonmaydi, faqat yetkazadi.
 */

export const TELEGRAM_WIDGET_SRC = "https://telegram.org/js/telegram-widget.js?22";
export const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";

type GoogleCredentialResponse = { credential?: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        ux_mode?: "popup" | "redirect";
        use_fedcm_for_button?: boolean;
      }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

declare global {
  interface Window {
    __yaqinTelegramAuth?: (user: TelegramAuth) => void;
    google?: GoogleIdentity;
  }
}

const loading = new Map<string, Promise<void>>();

/** Tashqi skriptni bir marta yuklaydi (qayta render qilinganda takrorlanmaydi) */
export function loadScript(src: string): Promise<void> {
  const existing = loading.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading.delete(src);
      reject(new Error(`Skript yuklanmadi: ${src}`));
    };
    document.head.append(script);
  });
  loading.set(src, promise);
  return promise;
}

/**
 * Telegram vidjeti o'z skripti joylashgan joyga iframe qo'yadi — shuning uchun skript har safar
 * konteyner ichiga qo'shiladi. Natija global callback orqali keladi.
 */
export function TelegramLoginButton({
  bot,
  onAuth,
  onError,
}: {
  bot: string;
  onAuth: (user: TelegramAuth) => void;
  onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const callback = useRef(onAuth);
  // Eng so'nggi callback — vidjet qayta yuklanmasdan (render paytida ref o'zgartirilmaydi)
  useEffect(() => {
    callback.current = onAuth;
  }, [onAuth]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    window.__yaqinTelegramAuth = (user) => callback.current(user);
    const script = document.createElement("script");
    script.src = TELEGRAM_WIDGET_SRC;
    script.async = true;
    script.dataset.telegramLogin = bot;
    script.dataset.size = "large";
    script.dataset.radius = "8";
    script.dataset.lang = locale;
    script.dataset.onauth = "__yaqinTelegramAuth(user)";
    script.onerror = onError;
    element.replaceChildren(script);
    return () => {
      element.replaceChildren();
      delete window.__yaqinTelegramAuth;
    };
  }, [bot, locale, onError]);

  return (
    <div ref={container} className="flex min-h-10 justify-center" data-testid="telegram-login" />
  );
}

export function GoogleLoginButton({
  clientId,
  onCredential,
  onError,
}: {
  clientId: string;
  onCredential: (credential: string) => void;
  onError: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const callback = useRef(onCredential);
  // Eng so'nggi callback — vidjet qayta yuklanmasdan (render paytida ref o'zgartirilmaydi)
  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadScript(GOOGLE_GSI_SRC)
      .then(() => {
        const element = container.current;
        if (cancelled || !element || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) callback.current(response.credential);
            else onError();
          },
          ux_mode: "popup",
        });
        window.google.accounts.id.renderButton(element, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "rectangular",
          locale,
          width: Math.min(400, Math.max(200, element.offsetWidth)),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          onError();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, locale, onError]);

  return failed ? null : (
    <div
      ref={container}
      className="flex min-h-10 w-full justify-center"
      data-testid="google-login"
    />
  );
}
