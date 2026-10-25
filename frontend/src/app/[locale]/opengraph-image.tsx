import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";

// Havola Telegram va boshqa ilovalarda ulashilganda ko'rinadigan rasm (1200×630)
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Yaqin";

export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const lang = (routing.locales as readonly string[]).includes(locale)
    ? (locale as AppLocale)
    : routing.defaultLocale;
  const t = await getTranslations({ locale: lang, namespace: "Common" });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: "linear-gradient(135deg, #0f766e 0%, #115e59 100%)",
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 112,
            height: 112,
            borderRadius: 28,
            background: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Logo belgisi: joylashuv nuqtasi */}
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#0f766e">
            <path d="M12 2a8 8 0 0 0-8 8c0 5.4 7 11.5 7.3 11.8a1 1 0 0 0 1.4 0C13 21.5 20 15.4 20 10a8 8 0 0 0-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" />
          </svg>
        </div>
        <div style={{ fontSize: 112, fontWeight: 700, letterSpacing: -3 }}>Yaqin</div>
      </div>
      <div style={{ marginTop: 48, fontSize: 52, lineHeight: 1.25, maxWidth: 960, opacity: 0.95 }}>
        {t("tagline")}
      </div>
      <div style={{ marginTop: 28, fontSize: 32, opacity: 0.8 }}>
        {lang === "ru" ? "Ташкент" : "Toshkent"}
      </div>
    </div>,
    size,
  );
}
