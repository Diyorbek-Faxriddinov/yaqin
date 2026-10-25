"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@/i18n/navigation";
import { browserApi, BrowserApiError, call } from "@/lib/api/browser";
import type { AdminMe, AdminPermission } from "@/lib/api/types";

export const adminMeKey = ["admin", "me"] as const;

export function useAdminMe() {
  return useQuery({
    queryKey: adminMeKey,
    queryFn: async (): Promise<AdminMe | null> => {
      try {
        return await call(browserApi.GET("/admin/me"));
      } catch (error) {
        if (error instanceof BrowserApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** Interfeysda tugmalarni ko'rsatish uchun (himoya — backendda) */
export function useCan(permission: AdminPermission): boolean {
  const { data: admin } = useAdminMe();
  return Boolean(admin && (admin.isRoot || admin.permissions.includes(permission)));
}

export function useAdminLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => call(browserApi.POST("/admin/auth/logout")),
    onSettled: () => {
      queryClient.removeQueries({ queryKey: ["admin"] });
      router.push("/admin/kirish");
      router.refresh();
    },
  });
}
