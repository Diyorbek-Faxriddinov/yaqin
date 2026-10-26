import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TelegramAuth } from "@/lib/api/types";
import {
  GOOGLE_GSI_SRC,
  GoogleLoginButton,
  TELEGRAM_WIDGET_SRC,
  TelegramLoginButton,
} from "./provider-buttons";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="uz" messages={{}}>
    {children}
  </NextIntlClientProvider>
);

const TELEGRAM_USER: TelegramAuth = {
  id: 777001,
  first_name: "Malika",
  auth_date: 1_800_000_000,
  hash: "abc",
};

afterEach(() => {
  delete window.google;
  document.head.querySelectorAll("script").forEach((script) => script.remove());
});

describe("TelegramLoginButton", () => {
  it("rasmiy vidjet skriptini bot nomi va til bilan qo'yadi, natijani yetkazadi", () => {
    const onAuth = vi.fn();
    const { container, unmount } = render(
      <TelegramLoginButton bot="yaqin_bot" onAuth={onAuth} onError={vi.fn()} />,
      { wrapper },
    );
    const script = container.querySelector("script");
    expect(script?.src).toBe(TELEGRAM_WIDGET_SRC);
    expect(script?.dataset.telegramLogin).toBe("yaqin_bot");
    expect(script?.dataset.lang).toBe("uz");
    expect(script?.dataset.onauth).toBe("__yaqinTelegramAuth(user)");

    window.__yaqinTelegramAuth?.(TELEGRAM_USER);
    expect(onAuth).toHaveBeenCalledWith(TELEGRAM_USER);

    // Sahifadan chiqilganda global callback qolmaydi
    unmount();
    expect(window.__yaqinTelegramAuth).toBeUndefined();
  });
});

describe("GoogleLoginButton", () => {
  it("GIS skripti yuklangach tugmani chizadi va ID tokenni yetkazadi", () => {
    const initialize = vi.fn();
    const renderButton = vi.fn();
    const onCredential = vi.fn();
    render(
      <GoogleLoginButton
        clientId="test.apps.googleusercontent.com"
        onCredential={onCredential}
        onError={vi.fn()}
      />,
      { wrapper },
    );
    const script = document.head.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_GSI_SRC}"]`,
    );
    expect(script).not.toBeNull();

    window.google = { accounts: { id: { initialize, renderButton } } };
    script?.dispatchEvent(new Event("load"));

    return vi.waitFor(() => {
      expect(initialize).toHaveBeenCalledWith(
        expect.objectContaining({ client_id: "test.apps.googleusercontent.com", ux_mode: "popup" }),
      );
      expect(renderButton).toHaveBeenCalledWith(
        expect.any(HTMLElement),
        expect.objectContaining({ locale: "uz", text: "signin_with" }),
      );
      const { callback } = initialize.mock.calls[0]?.[0] as {
        callback: (response: { credential?: string }) => void;
      };
      callback({ credential: "google.jwt.token" });
      expect(onCredential).toHaveBeenCalledWith("google.jwt.token");
    });
  });
});
