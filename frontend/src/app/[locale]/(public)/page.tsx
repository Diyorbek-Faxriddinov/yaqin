import { useTranslations } from "next-intl";

// Vaqtinchalik sahifa: haqiqiy bosh sahifa 2.4-qadamda quriladi
export default function HomePage() {
  const t = useTranslations("HomePage");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold sm:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}
