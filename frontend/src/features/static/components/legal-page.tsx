import { FileWarning } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LEGAL, type LegalKind } from "@/content/legal";
import type { AppLocale } from "@/i18n/routing";
import { formatDate } from "@/lib/format/date";

/** Huquqiy hujjat sahifasi: mundarija (langarlar) va bo'limlar */
export async function LegalPage({ kind }: { kind: LegalKind }) {
  const locale = (await getLocale()) as AppLocale;
  const t = await getTranslations("Static");
  const tNav = await getTranslations("Nav");
  const document = LEGAL[kind][locale];

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="space-y-3">
        <Breadcrumbs items={[{ label: tNav("home"), href: "/" }, { label: document.title }]} />
        <h1 className="text-3xl font-semibold">{document.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t("updated", { date: formatDate(`${document.updated}T12:00:00Z`, locale) })}
        </p>
      </div>

      {/* Ochiqlik: matn hali huquqshunos tekshiruvidan o'tmagan */}
      <Alert>
        <FileWarning aria-hidden="true" />
        <AlertDescription>{t("legalDraft")}</AlertDescription>
      </Alert>

      <nav aria-labelledby="legal-contents" className="rounded-xl border p-4">
        <h2 id="legal-contents" className="mb-2 text-sm font-medium text-muted-foreground">
          {t("contents")}
        </h2>
        <ol className="space-y-1 text-sm">
          {document.sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="underline-offset-4 hover:underline">
                {section.heading}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-8">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24 space-y-3">
            <h2 className="text-xl font-semibold">{section.heading}</h2>
            {section.body.map((block, index) =>
              typeof block === "string" ? (
                <p key={index} className="leading-relaxed">
                  {block}
                </p>
              ) : (
                <ul key={index} className="list-disc space-y-1.5 pl-5 leading-relaxed">
                  {block.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
