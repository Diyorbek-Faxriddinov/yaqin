"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Sabab yoki izoh so'raydigan oyna: sharhni rad etish, shikoyatga javob, bloklash.
 * Tayyor variantlar telefonda tez tanlash uchun; matnni keyin tahrirlash mumkin.
 */
export function NoteDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  submitLabel,
  presets = [],
  required = true,
  minLength = 3,
  maxLength,
  defaultValue = "",
  destructive = false,
  pending = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  submitLabel: string;
  presets?: string[];
  required?: boolean;
  minLength?: number;
  maxLength: number;
  defaultValue?: string;
  destructive?: boolean;
  pending?: boolean;
  onSubmit: (note: string) => void;
}) {
  const t = useTranslations("Admin.common");
  const [note, setNote] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  // Har ochilganda boshlang'ich qiymat (oldingi yozuvdan qolgan matn emas)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNote(defaultValue);
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const value = note.trim();
            if ((required || value) && value.length < minLength) {
              setError(t("minLength", { count: minLength }));
              return;
            }
            onSubmit(value);
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {presets.length > 0 && (
            <div role="group" aria-label={t("presets")} className="flex flex-wrap gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={note === preset}
                  onClick={() => {
                    setNote(preset);
                    setError(null);
                  }}
                >
                  {preset}
                </Button>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="note-dialog-text">
              {label}
              {!required && (
                <span className="font-normal text-muted-foreground"> ({t("optional")})</span>
              )}
            </Label>
            <Textarea
              id="note-dialog-text"
              rows={3}
              maxLength={maxLength}
              value={note}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "note-dialog-error" : undefined}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
            />
            {error && (
              <p id="note-dialog-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
            >
              {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
