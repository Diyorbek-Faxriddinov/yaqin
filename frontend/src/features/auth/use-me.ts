"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { browserApi, BrowserApiError, call } from "@/lib/api/browser";
import type { Me } from "@/lib/api/types";

export const meQueryKey = ["me"] as const;

/** Joriy foydalanuvchi: Me, null (kirilmagan) yoki undefined (yuklanmoqda) */
export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await call(browserApi.GET("/me"));
      } catch (error) {
        if (error instanceof BrowserApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** Tilsiz joriy yo'l (/ru prefiksisiz) — kirishdan keyin qaytish uchun */
export function currentPathWithoutLocale(): string {
  const { pathname, search, hash } = window.location;
  return `${pathname.replace(/^\/ru(?=\/|$)/, "") || "/"}${search}${hash}`;
}

export function loginHref(next: string): string {
  return `/kirish?next=${encodeURIComponent(next)}`;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => call(browserApi.POST("/auth/logout")),
    onSettled: () => {
      // Foydalanuvchiga tegishli barcha kesh tozalanadi
      queryClient.clear();
      queryClient.setQueryData(meQueryKey, null);
      router.push("/");
      router.refresh();
    },
  });
}
