"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { browserApi, BrowserApiError, call } from "@/lib/api/browser";
import type { AdminBusiness, AdminBusinessUpdate, ItemInput } from "@/lib/api/types";

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

export function useUpdateBusiness(id: string) {
  const lang = useLocale() as Lang;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminBusinessUpdate) =>
      call(
        browserApi.PATCH("/admin/businesses/{businessId}", {
          params: { path: { businessId: id }, query: { lang } },
          body,
        }),
      ),
    onSuccess: (business) => {
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

export function useAdminItems(id: string) {
  return useQuery({
    queryKey: adminItemsKey(id),
    queryFn: () =>
      call(
        browserApi.GET("/admin/businesses/{businessId}/items", {
          params: { path: { businessId: id } },
        }),
      ),
  });
}

export function useSaveItem(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, body }: { itemId?: string; body: ItemInput }) =>
      itemId
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
          ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminItemsKey(businessId) });
      void queryClient.invalidateQueries({ queryKey: adminBusinessesKey });
    },
  });
}

export function useDeleteItem(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      call(
        browserApi.DELETE("/admin/businesses/{businessId}/items/{itemId}", {
          params: { path: { businessId, itemId } },
        }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminItemsKey(businessId) }),
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

export type { AdminBusiness };
