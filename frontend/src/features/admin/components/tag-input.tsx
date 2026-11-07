"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeForSearch } from "@/lib/text/normalize";

export const MAX_TAGS = 15;
const MIN_LENGTH = 2;
const MAX_LENGTH = 40;
const MAX_SHOWN_SUGGESTIONS = 12;

const sameTag = (a: string, b: string) => normalizeForSearch(a) === normalizeForSearch(b);

/**
 * Qidiruv teglari (ADR-0016): saytda ko'rinmaydi, faqat qidiruvga kiradi. Teg Enter, vergul yoki
 * maydondan chiqqanda qo'shiladi. Vergul `onChange` da ham tekshiriladi: Android klaviaturalari
 * `keydown` da qaysi tugma bosilganini aytmaydi.
 */
export function TagInput({
  value,
  onChange,
  suggestions,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
}) {
  const t = useTranslations("Admin.catalog");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = (raw: string) => {
    const next = [...value];
    let problem: string | null = null;
    for (const part of raw.split(",")) {
      const tag = part.trim();
      if (!tag || next.some((existing) => sameTag(existing, tag))) continue;
      if (tag.length < MIN_LENGTH || tag.length > MAX_LENGTH || !normalizeForSearch(tag)) {
        problem = t("tagLength");
      } else if (next.length >= MAX_TAGS) {
        problem = t("tagsLimit", { max: MAX_TAGS });
      } else {
        next.push(tag);
      }
    }
    setError(problem);
    if (next.length !== value.length) onChange(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !text && value.length > 0) {
      onChange(value.slice(0, -1));
      return;
    }
    if (event.key !== "Enter") return;
    // Enter formani yubormasin
    event.preventDefault();
    add(text);
    setText("");
  };

  const onTextChange = (next: string) => {
    if (!next.includes(",")) return setText(next);
    add(next);
    setText("");
  };

  const shown = suggestions
    .filter((tag) => !value.some((existing) => sameTag(existing, tag)))
    .slice(0, MAX_SHOWN_SUGGESTIONS);

  return (
    <div className="grid gap-2">
      <Label htmlFor="item-tags">{t("tags")}</Label>
      {value.length > 0 && (
        <ul aria-label={t("tagsAdded")} className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <Badge variant="secondary" className="gap-1 pr-1">
                {tag}
                <button
                  type="button"
                  aria-label={t("tagRemove", { tag })}
                  className="inline-flex size-5 items-center justify-center rounded-full hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={() => onChange(value.filter((item) => item !== tag))}
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Input
        id="item-tags"
        value={text}
        placeholder={t("tagsPlaceholder")}
        enterKeyHint="done"
        aria-describedby="item-tags-hint"
        aria-invalid={Boolean(error)}
        onChange={(event) => onTextChange(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          add(text);
          setText("");
        }}
      />
      <p id="item-tags-hint" className="text-sm text-muted-foreground">
        {t("tagsHint")}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {shown.length > 0 && (
        <div role="group" aria-label={t("tagsSuggested")} className="flex flex-wrap gap-1.5">
          {shown.map((tag) => (
            <Button key={tag} type="button" variant="outline" size="sm" onClick={() => add(tag)}>
              <Plus aria-hidden="true" />
              {tag}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
