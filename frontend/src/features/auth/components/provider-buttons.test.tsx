import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_GSI_SRC,
  GoogleLoginButton,
  TELEGRAM_WIDGET_SRC,
  TelegramLoginButton,
  telegramAuthFromParams,
  withoutTelegramParams,
} from "./provider-buttons";

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider locale="uz" messages={{}}>
    {children}
  </NextIntlClientProvider>
);

afterEach(() => {
  delete window.google;
  document.head.querySelectorAll("script").forEach((script) => script.remove());
});

describe("TelegramLoginButton", () => {
  it("rasmiy vidjet skriptini bot nomi, til va qaytish manzili bilan qo'yadi", () => {
    const { container, unmount } = render(
      <TelegramLoginButton
        bot="yaqin_bot"
        authUrl="https://yaqinapp.uz/kirish?next=%2Fprofil"
        onError={vi.fn()}
      />,
      { wrapper },
    );
    const script = container.querySelector("script");
    expect(script?.src).toBe(TELEGRAM_WIDGET_SRC);
    expect(script?.dataset.telegramLogin).toBe("yaqin_bot");
    expect(script?.dataset.lang).toBe("uz");
    expect(script?.dataset.authUrl).toBe("https://yaqinapp.uz/kirish?next=%2Fprofil");
    // data-onauth'ni vidjet eval qiladi — CSP (unsafe-eval yo'q) skriptni to'xtatardi
    expect(script?.hasAttribute("data-onauth")).toBe(false);

    unmount();
    expect(container.querySelector("script")).toBeNull();
  });
});

describe("Telegram'dan qaytish", () => {
  it("manzildagi imzolangan maydonlarni oladi (sonlar — son sifatida)", () => {
    const params = new URLSearchParams(
      "next=%2Fprofil&id=777001&first_name=Malika&last_name=R.&username=malika" +
        "&photo_url=https%3A%2F%2Ft.me%2Fi%2Fuserpic%2F1.jpg&auth_date=1800000000&hash=abc123",
    );
    expect(telegramAuthFromParams(params)).toEqual({
      id: 777001,
      first_name: "Malika",
      last_name: "R.",
      username: "malika",
      photo_url: "https://t.me/i/userpic/1.jpg",
      auth_date: 1_800_000_000,
      hash: "abc123",
    });
  });

  it("majburiy maydon bo'lmasa yoki son noto'g'ri bo'lsa — null", () => {
    expect(telegramAuthFromParams(new URLSearchParams("next=%2Fprofil"))).toBeNull();
    expect(telegramAuthFromParams(new URLSearchParams("id=1&first_name=A&auth_date=1"))).toBeNull();
    expect(
      telegramAuthFromParams(new URLSearchParams("id=abc&first_name=A&auth_date=1&hash=x")),
    ).toBeNull();
    expect(
      telegramAuthFromParams(new URLSearchParams("id=&first_name=A&auth_date=1&hash=x")),
    ).toBeNull();
  });

  it("manzildan faqat Telegram maydonlari olib tashlanadi", () => {
    const url = new URL(
      "https://yaqinapp.uz/ru/kirish?next=%2Fprofil&id=1&first_name=A&auth_date=1&hash=x",
    );
    expect(withoutTelegramParams(url)).toBe("/ru/kirish?next=%2Fprofil");
    expect(withoutTelegramParams(new URL("https://yaqinapp.uz/kirish?id=1&hash=x"))).toBe(
      "/kirish",
    );
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
