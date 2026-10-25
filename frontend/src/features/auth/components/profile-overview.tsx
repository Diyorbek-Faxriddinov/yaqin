"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { browserApi, call } from "@/lib/api/browser";
import type { Me } from "@/lib/api/types";
import { meQueryKey, useLogout, useMe } from "../use-me";

function NameForm({ me }: { me: Me }) {
  const t = useTranslations("Profile");
  const queryClient = useQueryClient();
  const schema = z.object({
    displayName: z
      .string()
      .trim()
      .min(2, t("validation.displayName"))
      .max(40, t("validation.displayName")),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: me.displayName },
  });

  const save = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => call(browserApi.PATCH("/me", { body: values })),
    onSuccess: (user) => {
      queryClient.setQueryData(meQueryKey, user);
      form.reset({ displayName: user.displayName });
      toast.success(t("saved"));
    },
    onError: () => form.setError("displayName", { message: t("validation.displayName") }),
  });

  const error = form.formState.errors.displayName?.message;

  return (
    <form
      onSubmit={form.handleSubmit((values) => save.mutate(values))}
      noValidate
      className="space-y-2"
    >
      <Label htmlFor="displayName">{t("displayName")}</Label>
      <div className="flex gap-2">
        <Input
          id="displayName"
          autoComplete="nickname"
          maxLength={40}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "displayName-error" : "displayName-hint"}
          {...form.register("displayName")}
        />
        <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
          {save.isPending && <Loader2 aria-hidden="true" className="animate-spin" />}
          {t("save")}
        </Button>
      </div>
      {error ? (
        <p id="displayName-error" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id="displayName-hint" className="text-sm text-muted-foreground">
          {t("displayNameHint")}
        </p>
      )}
    </form>
  );
}

export function ProfileOverview() {
  const t = useTranslations("Profile");
  const tAuth = useTranslations("Auth");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const logout = useLogout();

  const deleteAccount = useMutation({
    mutationFn: () => call(browserApi.DELETE("/me")),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(meQueryKey, null);
      toast.success(t("deleted"));
      router.push("/");
      router.refresh();
    },
  });

  if (!me) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">{me.displayName}</h1>
        <p className="text-sm text-muted-foreground">{t(`provider.${me.provider}`)}</p>
      </div>

      <NameForm me={me} />

      <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
        <LogOut aria-hidden="true" />
        {tAuth("logout")}
      </Button>

      <section
        aria-labelledby="danger-zone"
        className="space-y-3 rounded-xl border border-destructive/30 p-4"
      >
        <h2 id="danger-zone" className="font-semibold">
          {t("dangerZone")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("deleteDescription")}</p>
        <ConfirmDialog
          trigger={<Button variant="destructive">{t("deleteButton")}</Button>}
          title={t("deleteConfirmTitle")}
          description={t("deleteDescription")}
          confirmLabel={t("deleteConfirm")}
          cancelLabel={t("cancel")}
          pending={deleteAccount.isPending}
          onConfirm={() => deleteAccount.mutateAsync()}
        />
      </section>
    </div>
  );
}
