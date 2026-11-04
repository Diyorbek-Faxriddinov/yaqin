"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useMe } from "@/features/auth/use-me";
import { browserApi, BrowserApiError, call, csrfHeaders } from "@/lib/api/browser";
import type { ApiError, ChangeInput, PendingUpload } from "@/lib/api/types";
import { compressImage } from "@/lib/image/compress";

/**
 * Biznes egasi kabineti (ADR-0015): egalar mijoz akkaunti bilan kiradi, o'zgarishlar taklif
 * sifatida yuboriladi va moderator tasdiqlagandan keyin saytga chiqadi.
 */

type Lang = "uz" | "ru";

export const cabinetKeys = {
  all: ["cabinet"] as const,
  businesses: ["cabinet", "businesses"] as const,
  business: (id: string) => ["cabinet", "business", id] as const,
  changes: (id: string) => ["cabinet", "business", id, "changes"] as const,
  stats: (id: string, days: number) => ["cabinet", "business", id, "stats", days] as const,
};

/** Mening bizneslarim; kirilmagan bo'lsa so'rov yuborilmaydi (bo'sh ro'yxat) */
export function useOwnedBusinesses() {
  const lang = useLocale() as Lang;
  const { data: me } = useMe();
  return useQuery({
    queryKey: [...cabinetKeys.businesses, lang],
    queryFn: () => call(browserApi.GET("/cabinet/businesses", { params: { query: { lang } } })),
    enabled: Boolean(me),
    staleTime: 60_000,
  });
}

export function ownedBusinessQuery(id: string, lang: Lang) {
  return {
    queryKey: cabinetKeys.business(id),
    queryFn: () =>
      call(
        browserApi.GET("/cabinet/businesses/{businessId}", {
          params: { path: { businessId: id }, query: { lang } },
        }),
      ),
  };
}

/**
 * Moderator qarori boshqa joyda (admin panelda) qabul qilinadi — kabinet maʼlumoti tez eskiradi:
 * tab ochilganda va oynaga qaytganda qayta so'raladi (umumiy sozlamada 60 s va fokussiz).
 */
const FRESH = { staleTime: 0, refetchOnWindowFocus: true } as const;

export function useOwnedBusiness(id: string) {
  const lang = useLocale() as Lang;
  return useQuery({ ...ownedBusinessQuery(id, lang), ...FRESH });
}

export function useOwnChanges(id: string, enabled = true) {
  return useQuery({
    queryKey: cabinetKeys.changes(id),
    queryFn: () =>
      call(
        browserApi.GET("/cabinet/businesses/{businessId}/changes", {
          params: { path: { businessId: id } },
        }),
      ),
    enabled,
    ...FRESH,
  });
}

/** Taklif yuborilgandan yoki qaytarib olingandan keyin: ro'yxat va kutilayotganlar soni */
export function refreshCabinet(queryClient: QueryClient, id: string) {
  void queryClient.invalidateQueries({ queryKey: cabinetKeys.changes(id) });
  void queryClient.invalidateQueries({ queryKey: cabinetKeys.businesses });
}

export function proposeChange(businessId: string, body: ChangeInput) {
  return call(
    browserApi.POST("/cabinet/businesses/{businessId}/changes", {
      params: { path: { businessId } },
      body,
    }),
  );
}

export function useWithdrawChange(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changeId: string) =>
      call(
        browserApi.POST("/cabinet/businesses/{businessId}/changes/{changeId}/withdraw", {
          params: { path: { businessId, changeId } },
        }),
      ),
    onSettled: () => refreshCabinet(queryClient, businessId),
  });
}

export function useLeaveBusiness(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      call(
        browserApi.DELETE("/cabinet/businesses/{businessId}/membership", {
          params: { path: { businessId } },
        }),
      ),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: cabinetKeys.business(businessId) });
      void queryClient.invalidateQueries({ queryKey: cabinetKeys.businesses });
    },
  });
}

export function useAcceptInvite() {
  const lang = useLocale() as Lang;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      call(browserApi.POST("/cabinet/invites/accept", { body: { token } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...cabinetKeys.businesses, lang] });
    },
  });
}

export function useOwnedBusinessStats(id: string, days: 7 | 30 | 90) {
  return useQuery({
    queryKey: cabinetKeys.stats(id, days),
    queryFn: () =>
      call(
        browserApi.GET("/cabinet/businesses/{businessId}/stats", {
          params: { path: { businessId: id }, query: { days } },
        }),
      ),
  });
}

/**
 * Taklif uchun rasm: brauzerda kichraytiriladi va yuklanadi. Saytda ko'rinmaydi — faqat
 * `previewUrl` orqali (sessiya bilan), moderator tasdiqlasa biznes rasmiga aylanadi.
 */
export async function uploadChangePhoto(businessId: string, file: File): Promise<PendingUpload> {
  const { blob } = await compressImage(file);
  const form = new FormData();
  form.set("file", blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
  const response = await fetch(`/api/v1/cabinet/businesses/${businessId}/uploads`, {
    method: "POST",
    body: form,
    headers: csrfHeaders(),
    credentials: "same-origin",
  });
  if (!response.ok) {
    throw new BrowserApiError(
      response.status,
      (await response.json().catch(() => undefined)) as ApiError | undefined,
    );
  }
  return (await response.json()) as PendingUpload;
}
