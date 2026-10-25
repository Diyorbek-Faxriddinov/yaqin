import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main
      id="main"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16"
    >
      <p className="text-sm font-medium text-neutral-500">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-4 text-neutral-600">{t("description")}</p>
      <Link href="/" className="mt-8 font-medium underline underline-offset-4">
        {t("backHome")}
      </Link>
    </main>
  );
}
