"use client";

import { useState } from "react";
import { Copy, Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useUpdateBusiness } from "../../use-admin-business";
import {
  applyPreset,
  copyToAll,
  fromSchedule,
  toSchedule,
  validateEditor,
  type EditorState,
  type Preset,
} from "../../schedule";
import type { SectionProps } from "./section-props";

// <input type="time"> 24:00 ni ko'rsata olmaydi — 00:00 bir xil maʼnoda (yopilish keyingi kunga o'tadi)
const toInput = (time: string) => (time === "24:00" ? "00:00" : time);

export function HoursSection({ business, canEdit, submitLabel, onDone }: SectionProps) {
  const t = useTranslations("Admin.hours");
  const tAdmin = useTranslations("Admin");
  const tDays = useTranslations("Business.weekdaysLong");
  const update = useUpdateBusiness(business.id);
  const [state, setState] = useState<EditorState>(() => fromSchedule(business.schedule));
  const [unknown, setUnknown] = useState(business.schedule === null);
  const [submitted, setSubmitted] = useState(false);
  const errors = validateEditor(state);
  const hasErrors = Object.keys(errors).length > 0;

  const updateDay = (
    weekday: number,
    patch: (day: EditorState["days"][number]) => EditorState["days"][number],
  ) =>
    setState((current) => ({
      ...current,
      days: current.days.map((day) => (day.weekday === weekday ? patch(day) : day)),
    }));

  const setPreset = (preset: Preset) => {
    setUnknown(false);
    setState(applyPreset(preset));
  };

  const save = () => {
    setSubmitted(true);
    if (!unknown && hasErrors) return;
    update.mutate(
      { schedule: unknown ? null : toSchedule(state) },
      { onSuccess: onDone, onError: () => toast.error(tAdmin("edit.saveError")) },
    );
  };

  return (
    <div className="space-y-5">
      <fieldset disabled={!canEdit} className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("presets")}</p>
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekdays", "always"] as const).map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreset(preset)}
              >
                {t(preset)}
              </Button>
            ))}
            <Button
              type="button"
              variant={unknown ? "default" : "outline"}
              size="sm"
              aria-pressed={unknown}
              onClick={() => setUnknown(!unknown)}
            >
              {t("unknown")}
            </Button>
          </div>
        </div>

        {!unknown && (
          <>
            <div className="flex items-center gap-2">
              <Switch
                id="hours-24x7"
                checked={state.is24x7}
                onCheckedChange={(checked) => setState((s) => ({ ...s, is24x7: checked }))}
              />
              <Label htmlFor="hours-24x7">{t("alwaysLabel")}</Label>
            </div>

            {!state.is24x7 && (
              <ul className="divide-y rounded-xl border">
                {state.days.map((day, dayIndex) => {
                  const dayName = tDays(String(day.weekday) as "1");
                  const error = submitted ? errors[day.weekday] : undefined;
                  return (
                    <li key={day.weekday} className="space-y-2 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`day-${day.weekday}`}
                            checked={day.open}
                            onCheckedChange={(open) =>
                              updateDay(day.weekday, (d) => ({ ...d, open }))
                            }
                          />
                          <Label htmlFor={`day-${day.weekday}`} className="min-w-24">
                            {dayName}
                          </Label>
                        </div>
                        {dayIndex === 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setState((s) => copyToAll(s, day.weekday))}
                          >
                            <Copy aria-hidden="true" />
                            {t("copyToAll")}
                          </Button>
                        )}
                      </div>

                      {day.open && (
                        <div className="space-y-2 pl-1">
                          {day.intervals.map((interval, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                type="time"
                                step={300}
                                aria-label={`${dayName} — ${t("from")}`}
                                value={toInput(interval.open)}
                                aria-invalid={Boolean(error)}
                                className={cn("w-32", error && "border-destructive")}
                                onChange={(e) =>
                                  updateDay(day.weekday, (d) => ({
                                    ...d,
                                    intervals: d.intervals.map((iv, i) =>
                                      i === index ? { ...iv, open: e.target.value } : iv,
                                    ),
                                  }))
                                }
                              />
                              <span aria-hidden="true">–</span>
                              <Input
                                type="time"
                                step={300}
                                aria-label={`${dayName} — ${t("to")}`}
                                value={toInput(interval.close)}
                                aria-invalid={Boolean(error)}
                                className={cn("w-32", error && "border-destructive")}
                                onChange={(e) =>
                                  updateDay(day.weekday, (d) => ({
                                    ...d,
                                    intervals: d.intervals.map((iv, i) =>
                                      i === index ? { ...iv, close: e.target.value } : iv,
                                    ),
                                  }))
                                }
                              />
                              {day.intervals.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label={t("removeInterval")}
                                  onClick={() =>
                                    updateDay(day.weekday, (d) => ({
                                      ...d,
                                      intervals: d.intervals.filter((_, i) => i !== index),
                                    }))
                                  }
                                >
                                  <X aria-hidden="true" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {day.intervals.length < 3 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="-ml-2"
                              onClick={() =>
                                updateDay(day.weekday, (d) => ({
                                  ...d,
                                  intervals: [...d.intervals, { open: "14:00", close: "18:00" }],
                                }))
                              }
                            >
                              <Plus aria-hidden="true" />
                              {t("addBreak")}
                            </Button>
                          )}
                          {error && (
                            <p className="text-sm text-destructive">
                              {t(`errors.${error}` as "errors.format")}
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </fieldset>

      {canEdit && (
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          onClick={save}
          disabled={update.isPending}
        >
          {update.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {submitLabel}
        </Button>
      )}
    </div>
  );
}
