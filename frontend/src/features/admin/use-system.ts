"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { browserApi, call } from "@/lib/api/browser";
import type {
  AdminRoleInput,
  AdminStaffCreate,
  AdminStaffUpdate,
  AuditTargetType,
  PlatformSettings,
} from "@/lib/api/types";

export const systemKeys = {
  staff: ["admin", "staff"] as const,
  roles: ["admin", "roles"] as const,
  audit: ["admin", "audit"] as const,
  settings: ["admin", "settings"] as const,
  stats: ["admin", "stats"] as const,
  reportLink: (businessId: string) => ["admin", "report-link", businessId] as const,
};

type Days = 7 | 30 | 90;

// --- Administratorlar va rollar ---

export function useStaff() {
  return useQuery({
    queryKey: systemKeys.staff,
    queryFn: () => call(browserApi.GET("/admin/staff")),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: systemKeys.roles,
    queryFn: () => call(browserApi.GET("/admin/roles")),
  });
}

/** Administrator va rol o'zgarishlari bir-biriga ta'sir qiladi (amaldagi ruxsatlar, sonlar) */
function useStaffInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: systemKeys.staff });
    void queryClient.invalidateQueries({ queryKey: systemKeys.roles });
  };
}

export function useCreateStaff() {
  const invalidate = useStaffInvalidation();
  return useMutation({
    mutationFn: (body: AdminStaffCreate) => call(browserApi.POST("/admin/staff", { body })),
    onSuccess: invalidate,
  });
}

export function useUpdateStaff() {
  const invalidate = useStaffInvalidation();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminStaffUpdate }) =>
      call(browserApi.PATCH("/admin/staff/{adminId}", { params: { path: { adminId: id } }, body })),
    onSuccess: invalidate,
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      call(
        browserApi.POST("/admin/staff/{adminId}/reset-password", {
          params: { path: { adminId: id } },
        }),
      ),
  });
}

export function useSaveRole() {
  const invalidate = useStaffInvalidation();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: AdminRoleInput }) =>
      id
        ? call(
            browserApi.PATCH("/admin/roles/{roleId}", { params: { path: { roleId: id } }, body }),
          )
        : call(browserApi.POST("/admin/roles", { body })),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useStaffInvalidation();
  return useMutation({
    mutationFn: (id: string) =>
      call(browserApi.DELETE("/admin/roles/{roleId}", { params: { path: { roleId: id } } })),
    onSuccess: invalidate,
  });
}

// --- Audit ---

export function useAudit(targetType: AuditTargetType | null) {
  const query = useInfiniteQuery({
    queryKey: [...systemKeys.audit, targetType],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      call(
        browserApi.GET("/admin/audit", {
          params: {
            query: { page: pageParam, pageSize: 30, targetType: targetType ?? undefined },
          },
        }),
      ),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
  return {
    ...query,
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    total: query.data?.pages[0]?.total,
  };
}

// --- Sozlamalar ---

export function useSettings() {
  return useQuery({
    queryKey: systemKeys.settings,
    queryFn: () => call(browserApi.GET("/admin/settings")),
  });
}

export function useSaveSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PlatformSettings) => call(browserApi.PUT("/admin/settings", { body })),
    onSuccess: (settings) => queryClient.setQueryData(systemKeys.settings, settings),
  });
}

// --- Statistika ---

export function usePlatformStats(days: Days) {
  return useQuery({
    queryKey: [...systemKeys.stats, "platform", days],
    queryFn: () => call(browserApi.GET("/admin/stats", { params: { query: { days } } })),
  });
}

export function useBusinessStats(businessId: string, days: Days) {
  return useQuery({
    queryKey: [...systemKeys.stats, "business", businessId, days],
    queryFn: () =>
      call(
        browserApi.GET("/admin/businesses/{businessId}/stats", {
          params: { path: { businessId }, query: { days } },
        }),
      ),
  });
}

// --- Egasi uchun hisobot havolasi ---

export function useReportLink(businessId: string) {
  return useQuery({
    queryKey: systemKeys.reportLink(businessId),
    queryFn: () =>
      call(
        browserApi.GET("/admin/businesses/{businessId}/report-link", {
          params: { path: { businessId } },
        }),
      ),
  });
}

export function useCreateReportLink(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      call(
        browserApi.POST("/admin/businesses/{businessId}/report-link", {
          params: { path: { businessId } },
        }),
      ),
    onSuccess: ({ status }) => queryClient.setQueryData(systemKeys.reportLink(businessId), status),
  });
}

export function useRevokeReportLink(businessId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      call(
        browserApi.DELETE("/admin/businesses/{businessId}/report-link", {
          params: { path: { businessId } },
        }),
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: systemKeys.reportLink(businessId) }),
  });
}

export type { Days };
