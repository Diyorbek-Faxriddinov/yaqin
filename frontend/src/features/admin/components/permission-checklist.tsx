"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import type { AdminPermission } from "@/lib/api/types";

/** Ruxsatlar mazmun bo'yicha guruhlangan — tanlashda tushunarli bo'lishi uchun */
export const PERMISSION_GROUPS: Array<{ key: string; permissions: AdminPermission[] }> = [
  { key: "businesses", permissions: ["business.view", "business.edit", "business.publish"] },
  { key: "content", permissions: ["category.manage", "review.moderate", "complaint.manage"] },
  { key: "users", permissions: ["user.view", "user.manage"] },
  { key: "system", permissions: ["stats.view", "audit.view", "settings.manage", "staff.manage"] },
];

/** Ruxsat nomi tarjimada nuqtasiz kalit bilan: business.view → business_view */
export const permissionKey = (permission: AdminPermission) => permission.replace(".", "_");

export function PermissionChecklist({
  idPrefix,
  value,
  onChange,
  disabled = [],
}: {
  idPrefix: string;
  value: AdminPermission[];
  onChange: (value: AdminPermission[]) => void;
  /** Rol orqali allaqachon berilgan — belgilangan va o'zgarmas ko'rinadi */
  disabled?: AdminPermission[];
}) {
  const t = useTranslations("Admin.permissions");
  const toggle = (permission: AdminPermission, checked: boolean) =>
    onChange(checked ? [...value, permission] : value.filter((p) => p !== permission));

  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => (
        <fieldset key={group.key} className="space-y-2">
          <legend className="text-sm font-medium text-muted-foreground">
            {t(`groups.${group.key}`)}
          </legend>
          {group.permissions.map((permission) => {
            const id = `${idPrefix}-${permissionKey(permission)}`;
            const inherited = disabled.includes(permission);
            return (
              <div key={permission} className="flex items-start gap-3">
                <Checkbox
                  id={id}
                  checked={inherited || value.includes(permission)}
                  disabled={inherited}
                  onCheckedChange={(checked) => toggle(permission, checked === true)}
                  aria-describedby={`${id}-hint`}
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <label htmlFor={id} className="text-sm leading-tight">
                    {t(`items.${permissionKey(permission)}.name`)}
                  </label>
                  <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                    {inherited ? t("fromRole") : t(`items.${permissionKey(permission)}.hint`)}
                  </p>
                </div>
              </div>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
