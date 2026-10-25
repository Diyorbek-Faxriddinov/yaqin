"use client";

import { useState } from "react";
import {
  Copy,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { RetryButton } from "@/components/common/retry-button";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getPathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { BrowserApiError } from "@/lib/api/browser";
import type { AdminPermission, AdminRole, AdminStaff } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { isDemoMode } from "@/lib/env";
import { useAdminMe } from "../use-admin";
import {
  useCreateStaff,
  useDeleteRole,
  useResetPassword,
  useRoles,
  useSaveRole,
  useStaff,
  useUpdateStaff,
} from "../use-system";
import { PermissionChecklist, permissionKey } from "./permission-checklist";

const USERNAME = /^[a-z][a-z0-9_.-]{2,31}$/;

/** Server xatosi: maydon xabari yoki umumiy matn */
function errorText(error: unknown, fallback: string): string {
  if (error instanceof BrowserApiError) {
    const field = error.body?.fields && Object.values(error.body.fields)[0]?.[0];
    return field ?? error.message;
  }
  return fallback;
}

/** Vaqtinchalik parol faqat bir marta ko'rsatiladi — backend uning xeshini saqlaydi */
function PasswordDialog({
  value,
  onOpenChange,
}: {
  value: { username: string; password: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin.staff");
  return (
    <Dialog open={value !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("passwordTitle")}</DialogTitle>
          <DialogDescription>{t("passwordDescription")}</DialogDescription>
        </DialogHeader>
        {value && (
          <div className="space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-muted p-3 text-sm">
              <dt className="text-muted-foreground">{t("username")}</dt>
              <dd className="font-mono">{value.username}</dd>
              <dt className="text-muted-foreground">{t("temporaryPassword")}</dt>
              <dd className="font-mono break-all" data-testid="temporary-password">
                {value.password}
              </dd>
            </dl>
            {isDemoMode && <p className="text-sm text-muted-foreground">{t("demoTotp")}</p>}
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (!value) return;
              void navigator.clipboard
                ?.writeText(value.password)
                .then(() => toast.success(t("copied")))
                .catch(() => toast.error(t("copyFailed")));
            }}
          >
            <Copy aria-hidden="true" />
            {t("copy")}
          </Button>
          <Button onClick={() => onOpenChange(false)}>{t("done")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaffDialog({
  open,
  staff,
  roles,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  /** null — yangi administrator */
  staff: AdminStaff | null;
  roles: AdminRole[];
  onOpenChange: (open: boolean) => void;
  onCreated: (username: string, password: string) => void;
}) {
  const t = useTranslations("Admin.staff");
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(staff?.displayName ?? "");
  const [roleIds, setRoleIds] = useState<string[]>(staff?.roles.map((r) => r.id) ?? []);
  const [extra, setExtra] = useState<AdminPermission[]>(staff?.extraPermissions ?? []);
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;
  const fromRoles = roles
    .filter((role) => roleIds.includes(role.id))
    .flatMap((role) => role.permissions);

  const submit = () => {
    if (!staff && !USERNAME.test(username)) return setError(t("validation.username"));
    if (displayName.trim().length < 2) return setError(t("validation.displayName"));
    const extraPermissions = extra.filter((p) => !fromRoles.includes(p));
    const options = {
      onError: (e: unknown) => setError(errorText(e, t("error"))),
    };
    if (staff) {
      update.mutate(
        { id: staff.id, body: { displayName: displayName.trim(), roleIds, extraPermissions } },
        {
          ...options,
          onSuccess: () => {
            toast.success(t("saved"));
            onOpenChange(false);
          },
        },
      );
    } else {
      create.mutate(
        { username, displayName: displayName.trim(), roleIds, extraPermissions },
        {
          ...options,
          onSuccess: ({ temporaryPassword }) => {
            onOpenChange(false);
            onCreated(username, temporaryPassword);
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {staff ? t("editTitle", { name: staff.displayName }) : t("newTitle")}
          </DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {!staff && (
            <div className="grid gap-2">
              <Label htmlFor="staff-username">{t("username")}</Label>
              <Input
                id="staff-username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                aria-describedby="staff-username-hint"
              />
              <p id="staff-username-hint" className="text-xs text-muted-foreground">
                {t("usernameHint")}
              </p>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="staff-name">{t("displayName")}</Label>
            <Input
              id="staff-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("roles")}</legend>
            {roles.map((role) => (
              <div key={role.id} className="flex items-start gap-3">
                <Checkbox
                  id={`staff-role-${role.id}`}
                  checked={roleIds.includes(role.id)}
                  onCheckedChange={(checked) =>
                    setRoleIds((ids) =>
                      checked === true ? [...ids, role.id] : ids.filter((id) => id !== role.id),
                    )
                  }
                  className="mt-0.5"
                />
                <div className="grid gap-0.5">
                  <label htmlFor={`staff-role-${role.id}`} className="text-sm leading-tight">
                    {role.name}
                  </label>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  )}
                </div>
              </div>
            ))}
          </fieldset>
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t("extraPermissions")}
            </summary>
            <p className="mt-2 mb-3 text-xs text-muted-foreground">{t("extraHint")}</p>
            <PermissionChecklist
              idPrefix="staff-extra"
              value={extra}
              onChange={setExtra}
              disabled={fromRoles}
            />
          </details>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {staff ? t("save") : t("create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleDialog({
  open,
  role,
  onOpenChange,
}: {
  open: boolean;
  role: AdminRole | null;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin.roles");
  const save = useSaveRole();
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [permissions, setPermissions] = useState<AdminPermission[]>(role?.permissions ?? []);
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? t("editTitle") : t("newTitle")}</DialogTitle>
          {role && role.adminCount > 0 && (
            <DialogDescription>{t("affects", { count: role.adminCount })}</DialogDescription>
          )}
        </DialogHeader>
        <form
          noValidate
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length < 2) return setError(t("validation.name"));
            if (permissions.length === 0) return setError(t("validation.permissions"));
            save.mutate(
              {
                id: role?.id,
                body: { name: name.trim(), description: description.trim() || null, permissions },
              },
              {
                onSuccess: () => {
                  toast.success(t("saved"));
                  onOpenChange(false);
                },
                onError: (e) => setError(errorText(e, t("error"))),
              },
            );
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="role-name">{t("name")}</Label>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-description">{t("description")}</Label>
            <Textarea
              id="role-description"
              rows={2}
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <PermissionChecklist idPrefix="role" value={permissions} onChange={setPermissions} />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={save.isPending}>
            {save.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
            {t("save")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StaffCard({
  staff,
  canManage,
  onEdit,
  onPassword,
}: {
  staff: AdminStaff;
  canManage: boolean;
  onEdit: () => void;
  onPassword: (password: string) => void;
}) {
  const t = useTranslations("Admin.staff");
  const tPermissions = useTranslations("Admin.permissions");
  const locale = useLocale();
  const update = useUpdateStaff();
  const reset = useResetPassword();
  const editable = canManage && !staff.isRoot;

  return (
    <article className="space-y-3 rounded-xl border p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{staff.displayName}</span>
            {staff.isRoot && (
              <Badge className="border-transparent bg-primary-soft text-primary-soft-foreground">
                <ShieldCheck aria-hidden="true" />
                Root
              </Badge>
            )}
            {!staff.isActive && (
              <Badge className="border-transparent bg-muted text-muted-foreground">
                {t("inactive")}
              </Badge>
            )}
          </p>
          <p className="font-mono text-sm text-muted-foreground">{staff.username}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          {staff.lastLoginAt
            ? t("lastLogin", { date: formatDate(staff.lastLoginAt, locale) })
            : t("neverLoggedIn")}
        </p>
      </header>

      {staff.roles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {staff.roles.map((role) => (
            <Badge key={role.id} variant="secondary">
              {role.name}
            </Badge>
          ))}
        </div>
      )}

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          {staff.isRoot
            ? t("rootPermissions")
            : t("effective", { count: staff.effectivePermissions.length })}
        </summary>
        {!staff.isRoot && (
          <ul className="mt-2 space-y-1 text-sm">
            {staff.effectivePermissions.map(({ permission, sources }) => (
              <li key={permission} className="flex flex-wrap justify-between gap-x-3">
                <span>{tPermissions(`items.${permissionKey(permission)}.name`)}</span>
                <span className="text-xs text-muted-foreground">
                  {sources
                    .map((source) =>
                      source.type === "role"
                        ? t("sourceRole", { role: source.role.name })
                        : t("sourceDirect"),
                    )
                    .join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>

      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil aria-hidden="true" />
            {t("edit")}
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="outline">
                <KeyRound aria-hidden="true" />
                {t("resetPassword")}
              </Button>
            }
            title={t("resetConfirm", { name: staff.displayName })}
            description={t("resetHint")}
            confirmLabel={t("resetPassword")}
            cancelLabel={t("cancel")}
            pending={reset.isPending}
            onConfirm={async () => {
              try {
                const { temporaryPassword } = await reset.mutateAsync(staff.id);
                onPassword(temporaryPassword);
              } catch {
                toast.error(t("error"));
              }
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            disabled={update.isPending}
            onClick={() =>
              update.mutate(
                { id: staff.id, body: { isActive: !staff.isActive } },
                {
                  onSuccess: () =>
                    toast.success(staff.isActive ? t("deactivated") : t("activated")),
                  onError: () => toast.error(t("error")),
                },
              )
            }
          >
            <Power aria-hidden="true" />
            {staff.isActive ? t("deactivate") : t("activate")}
          </Button>
        </div>
      )}
    </article>
  );
}

function RolesTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations("Admin.roles");
  const tPermissions = useTranslations("Admin.permissions");
  const { data: roles, isPending } = useRoles();
  const remove = useDeleteRole();
  const [editing, setEditing] = useState<{ role: AdminRole | null } | null>(null);

  if (isPending) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      {canManage && (
        <Button onClick={() => setEditing({ role: null })}>
          <Plus aria-hidden="true" />
          {t("add")}
        </Button>
      )}
      <ul className="space-y-3">
        {roles?.map((role) => (
          <li key={role.id}>
            <article className="space-y-2 rounded-xl border p-4">
              <header className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{role.name}</h3>
                {role.isBuiltIn && <Badge variant="outline">{t("builtIn")}</Badge>}
                <span className="text-sm text-muted-foreground">
                  · {t("admins", { count: role.adminCount })}
                </span>
              </header>
              {role.description && (
                <p className="text-sm text-muted-foreground">{role.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary">
                    {tPermissions(`items.${permissionKey(permission)}.name`)}
                  </Badge>
                ))}
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing({ role })}>
                    <Pencil aria-hidden="true" />
                    {t("edit")}
                  </Button>
                  {!role.isBuiltIn && role.adminCount === 0 && (
                    <ConfirmDialog
                      trigger={
                        <Button size="sm" variant="ghost">
                          <Trash2 aria-hidden="true" />
                          {t("delete")}
                        </Button>
                      }
                      title={t("deleteConfirm", { name: role.name })}
                      confirmLabel={t("delete")}
                      cancelLabel={t("cancel")}
                      pending={remove.isPending}
                      onConfirm={async () => {
                        try {
                          await remove.mutateAsync(role.id);
                          toast.success(t("deleted"));
                        } catch (error) {
                          toast.error(errorText(error, t("error")));
                        }
                      }}
                    />
                  )}
                </div>
              )}
            </article>
          </li>
        ))}
      </ul>
      <RoleDialog
        key={editing ? (editing.role?.id ?? "new") : "closed"}
        open={editing !== null}
        role={editing?.role ?? null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}

type Section = "admins" | "roles";

/** Administratorlar va rollar: ko'rish — staff.manage, o'zgartirish — faqat Root (ADR-0009) */
export function StaffManager({ initialSection }: { initialSection: Section }) {
  const t = useTranslations("Admin.staff");
  const tStates = useTranslations("States");
  const locale = useLocale() as AppLocale;
  const { data: me } = useAdminMe();
  const canManage = Boolean(me?.isRoot);
  const { data: staff, isPending, isError, refetch } = useStaff();
  const { data: roles } = useRoles();
  const [section, setSection] = useState<Section>(initialSection);
  const [editing, setEditing] = useState<{ staff: AdminStaff | null } | null>(null);
  const [password, setPassword] = useState<{ username: string; password: string } | null>(null);

  const changeSection = (value: string) => {
    const next: Section = value === "roles" ? "roles" : "admins";
    setSection(next);
    const path = getPathname({ href: "/admin/administratorlar", locale });
    window.history.replaceState(null, "", next === "roles" ? `${path}?bolim=rollar` : path);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canManage && section === "admins" && (
          <Button onClick={() => setEditing({ staff: null })}>
            <Plus aria-hidden="true" />
            {t("add")}
          </Button>
        )}
      </div>

      {!canManage && (
        <Alert>
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>{t("readOnly")}</AlertDescription>
        </Alert>
      )}

      <Tabs value={section} onValueChange={changeSection}>
        <TabsList aria-label={t("sections")}>
          <TabsTrigger value="admins">{t("tabAdmins")}</TabsTrigger>
          <TabsTrigger value="roles">{t("tabRoles")}</TabsTrigger>
        </TabsList>
        <TabsContent value="admins" className="pt-4">
          {isPending ? (
            <Skeleton className="h-64" />
          ) : isError ? (
            <ErrorState
              title={tStates("errorTitle")}
              description={tStates("errorDescription")}
              action={<RetryButton onRetry={() => void refetch()} />}
            />
          ) : (
            <ul className="space-y-3">
              {staff.map((item) => (
                <li key={item.id}>
                  <StaffCard
                    staff={item}
                    canManage={canManage}
                    onEdit={() => setEditing({ staff: item })}
                    onPassword={(value) =>
                      setPassword({ username: item.username, password: value })
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="roles" className="pt-4">
          <RolesTab canManage={canManage} />
        </TabsContent>
      </Tabs>

      <StaffDialog
        key={editing ? (editing.staff?.id ?? "new") : "closed"}
        open={editing !== null}
        staff={editing?.staff ?? null}
        roles={roles ?? []}
        onOpenChange={(open) => !open && setEditing(null)}
        onCreated={(username, value) => setPassword({ username, password: value })}
      />
      <PasswordDialog value={password} onOpenChange={(open) => !open && setPassword(null)} />
    </div>
  );
}
