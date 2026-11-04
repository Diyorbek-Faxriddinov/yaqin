"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import {
  ownedBusinessQuery,
  proposeChange,
  refreshCabinet,
  useOwnChanges,
} from "@/features/cabinet/use-cabinet";
import { browserApi, BrowserApiError, call } from "@/lib/api/browser";
import type {
  AdminBusiness,
  AdminBusinessUpdate,
  AdminItem,
  ItemInput,
  OwnerProfileInput,
  PhotoRef,
} from "@/lib/api/types";
import { useOwnerMode } from "./owner-mode";

type Lang = "uz" | "ru";

export const adminBusinessKey = (id: string) => ["admin", "business", id] as const;
export const adminBusinessesKey = ["admin", "businesses"] as const;
export const adminItemsKey = (id: string) => ["admin", "business", id, "items"] as const;

export function useAdminBusiness(id: string | null) {
  const lang = useLocale() as Lang;
  return useQuery({
    queryKey: adminBusinessKey(id ?? ""),
    queryFn: () =>
      call(
        browserApi.GET("/admin/businesses/{businessId}", {
          params: { path: { businessId: id ?? "" }, query: { lang } },
        }),
      ),
    enabled: Boolean(id),
  });
}

export function useCreateBusiness() {
  const lang = useLocale() as Lang;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; categorySlug: string; districtSlug: string }) =>
      call(browserApi.POST("/admin/businesses", { params: { query: { lang } }, body })),
    onSuccess: (business) => {
      queryClient.setQueryData(adminBusinessKey(business.id), business);
      void queryClient.invalidateQueries({ queryKey: adminBusinessesKey });
    },
  });
}

/**
 * Biznes maydonlarini saqlash. Egasi rejimida — profil taklifi (natija `null`): rozilik va holat
 * egaga tegishli emas, yuborilmaydi.
 */
export function useUpdateBusiness(id: string) {
  const lang = useLocale() as Lang;
  const owner = useOwnerMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: AdminBusinessUpdate): Promise<AdminBusiness | null> => {
      if (owner) {
        const { consent: _consent, status: _status, ...profile } = body;
        await proposeChange(id, { kind: "profile", profile: profile as OwnerProfileInput });
        return null;
      }
      return call(
        browserApi.PATCH("/admin/businesses/{businessId}", {
          params: { path: { businessId: id }, query: { lang } },
          body,
        }),
      );
    },
    onSuccess: (business) => {
      if (!business) return refreshCabinet(queryClient, id);
      queryClient.setQueryData(adminBusinessKey(id), business);
      void queryClient.invalidateQueries({ queryKey: adminBusinessesKey });
    },
  });
}

/** Faqat hech qachon e'lon qilinmagan biznes (backend boshqasiga 409 qaytaradi) */
export function useDeleteBusiness(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      call(
        browserApi.DELETE("/admin/businesses/{businessId}", {
          params: { path: { businessId: id } },
        }),
      ),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: adminBusinessKey(id) });
      void queryClient.invalidateQueries({ queryKey: adminBusinessesKey });
    },
  });
}

/** Rasm ro'yxati o'zgarganda biznes qayta olinadi */
export function useRefreshBusiness(id: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminBusinessKey(id) });
    void queryClient.invalidateQueries({ queryKey: adminBusinessesKey });
  };
}

/** Katalog. Egasi rejimida — kabinet biznes maʼlumotidan (joriy, tasdiqlangan holat) */
export function useAdminItems(id: string) {
  const lang = useLocale() as Lang;
  const owner = useOwnerMode();
  const admin = useQuery({
    queryKey: adminItemsKey(id),
    queryFn: () =>
      call(
        browserApi.GET("/admin/businesses/{businessId}/items", {
          params: { path: { businessId: id } },
        }),
      ),
    enabled: !owner,
  });
  const cabinet = useQuery({
    ...ownedBusinessQuery(id, lang),
    select: (business): AdminItem[] => business.items,
    enabled: owner,
  });
  return owner ? cabinet : admin;
}

/** Egasi rejimida: tekshiruvdagi takliflari bor mahsulotlar (ro'yxatda belgi uchun) */
export function usePendingItemIds(businessId: string): Set<string> {
  const owner = useOwnerMode();
  const { data } = useOwnChanges(businessId, owner);
  return new Set(
    (data ?? []).flatMap((change) =>
      change.status === "pending" && change.itemId ? [change.itemId] : [],
    ),
  );
}

export type SaveItemInput = {
  itemId?: string;
  body: ItemInput;
  /** Egasi rejimida: rasmlarning yakuniy tartiblangan ro'yxati (admin rasmlarni alohida saqlaydi) */
  photos?: PhotoRef[];
};

/** Mahsulotni saqlash. Egasi rejimida — taklif (natija `null`) */
export function useSaveItem(businessId: string) {
  const owner = useOwnerMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ itemId, body, photos = [] }: SaveItemInput): Promise<AdminItem | null> => {
      if (owner) {
        await proposeChange(
          businessId,
          itemId
            ? { kind: "item.update", itemId, item: body, photos }
            : { kind: "item.create", item: body, photos },
        );
        return null;
      }
      return itemId
        ? call(
            browserApi.PUT("/admin/businesses/{businessId}/items/{itemId}", {
              params: { path: { businessId, itemId } },
              body,
            }),
          )
        : call(
            browserApi.POST("/admin/businesses/{businessId}/items", {
              params: { path: { businessId } },
              body,
            }),
          );
    },
    onSuccess: (item) => {
      if (!item) return refreshCabinet(queryClient, businessId);
      void queryClient.invalidateQueries({ queryKey: adminItemsKey(businessId) });
      void queryClient.invalidateQueries({ queryKey: adminBusinessesKey });
    },
  });
}

/** Mahsulotni o'chirish. Egasi rejimida — o'chirish taklifi */
export function useDeleteItem(businessId: string) {
  const owner = useOwnerMode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      if (owner) {
        await proposeChange(businessId, { kind: "item.delete", itemId });
        return;
      }
      await call(
        browserApi.DELETE("/admin/businesses/{businessId}/items/{itemId}", {
          params: { path: { businessId, itemId } },
        }),
      );
    },
    onSuccess: () =>
      owner
        ? refreshCabinet(queryClient, businessId)
        : void queryClient.invalidateQueries({ queryKey: adminItemsKey(businessId) }),
  });
}

/** Tanlash ro'yxatlari: ichki kategoriyalar (ota bo'yicha guruhlangan) va tumanlar */
export function useCatalogOptions() {
  const lang = useLocale() as Lang;
  const categories = useQuery({
    queryKey: ["categories", lang],
    queryFn: () => call(browserApi.GET("/categories", { params: { query: { lang } } })),
    staleTime: 60 * 60_000,
  });
  const districts = useQuery({
    queryKey: ["districts", lang],
    queryFn: () => call(browserApi.GET("/districts", { params: { query: { lang } } })),
    staleTime: 60 * 60_000,
  });
  return { categories: categories.data ?? [], districts: districts.data ?? [] };
}

/**
 * Server qaytargan maydon xatolarini (400 → fields) formaga ko'chiradi.
 * Natija: xato formaga bog'landimi (aks holda umumiy xabar ko'rsatiladi).
 */
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  mapping: Partial<Record<string, Path<T>>>,
): boolean {
  if (!(error instanceof BrowserApiError) || error.status !== 400 || !error.body?.fields)
    return false;
  let applied = false;
  for (const [field, messages] of Object.entries(error.body.fields)) {
    const target = mapping[field];
    if (target) {
      form.setError(target, { message: messages[0] });
      applied = true;
    }
  }
  return applied;
}

/**
 * Saqlash xatosining foydalanuvchiga tushunarli matni (tarjima kaliti `Admin.edit.*`):
 * o'zgarish yo'q, kutilayotgan takliflar ko'p (egasi), juda ko'p urinish. Boshqasi — umumiy xabar.
 */
export function saveErrorKey(
  error: unknown,
): "edit.nothingChanged" | "edit.tooManyPending" | "edit.tooManyRequests" | "edit.saveError" {
  if (!(error instanceof BrowserApiError)) return "edit.saveError";
  if (error.status === 429) return "edit.tooManyRequests";
  if (error.status === 409 && error.body?.code === "too_many_pending") return "edit.tooManyPending";
  if (error.status === 400 && error.body?.fields?.non_field_errors) return "edit.nothingChanged";
  return "edit.saveError";
}

export type { AdminBusiness };
