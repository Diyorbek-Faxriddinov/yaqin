import { useTranslations } from "next-intl";

// Vaqtinchalik sahifa: haqiqiy bosh sahifa 2.4-qadamda quriladi
export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16"
    >
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-lg text-neutral-600">{t("subtitle")}</p>
    </main>
  );
}
