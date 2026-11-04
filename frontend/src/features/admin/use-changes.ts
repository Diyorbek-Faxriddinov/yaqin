"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { browserApi, call } from "@/lib/api/browser";
import type { ChangeStatus } from "@/lib/api/types";
import { adminBusinessesKey, adminBusinessKey, adminItemsKey } from "./use-admin-business";

/** Biznes egalari takliflari va egalik (ADR-0015) — admin tomoni */

type Lang = "uz" | "ru";
const PAGE_SIZE = 20;

export const changeKeys = {
  all: ["admin", "changes"] as const,
  list: (status: ChangeStatus, businessId: string | null) =>
    ["admin", "changes", "list", status, businessId] as const,
  count: ["admin", "changes", "count"] as const,
  detail: (id: string) => ["admin", "changes", "detail", id] as const,
  owners: (businessId: string) => ["admin", "business", businessId, "owners"] as const,
};

export function useChangeQueue(status: ChangeStatus, businessId: string | null) {
  const query = useInfiniteQuery({
    queryKey: changeKeys.list(status, businessId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      call(
        browserApi.GET("/admin/changes", {
          params: {
            query: {
              status,
              page: pageParam,
              pageSize: PAGE_SIZE,
              ...(businessId ? { businessId } : {}),
            },
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

/** Kutilayotgan takliflar soni (navigatsiya va bosh panel); ruxsat bo'lmasa so'rov yo'q */
export function usePendingChangesCount(enabled: boolean, businessId?: string): number | undefined {
  const { data } = useQuery({
    queryKey: [...changeKeys.count, businessId ?? null],
    enabled,
    queryFn: async () =>
      (
        await call(
          browserApi.GET("/admin/changes", {
            params: {
              query: { status: "pending", pageSize: 1, ...(businessId ? { businessId } : {}) },
            },
          }),
        )
      ).total,
  });
  return data;
}

export function useChange(id: string) {
  const lang = useLocale() as Lang;
  return useQuery({
    queryKey: changeKeys.detail(id),
    queryFn: () =>
      call(
        browserApi.GET("/admin/changes/{changeId}", {
          params: { path: { changeId: id }, query: { lang } },
        }),
      ),
  });
}

/** Tasdiq yoki rad etishdan keyin: navbat, taklif va biznes maʼlumoti yangilanadi */
function useAfterReview() {
  const queryClient = useQueryClient();
  return (businessId: string) => {
    void queryClient.invalidateQueries({ queryKey: changeKeys.all });
    void queryClient.invalidateQueries({ queryKey: adminBusinessKey(businessId) });
    void queryClient.invalidateQueries({ queryKey: adminItemsKey(businessId) });
    void queryClient.invalidateQueries({ queryKey: adminBusinessesKey });
  };
}

export function useApproveChange() {
  const after = useAfterReview();
  return useMutation({
    mutationFn: (id: string) =>
      call(
        browserApi.POST("/admin/changes/{changeId}/approve", {
          params: { path: { changeId: id } },
        }),
      ),
    onSuccess: (change) => after(change.business.id),
  });
}

export function useRejectChange() {
  const after = useAfterReview();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      call(
        browserApi.POST("/admin/changes/{changeId}/reject", {
          params: { path: { changeId: id } },
          body: { reason },
        }),
      ),
    onSuccess: (change) => after(change.business.id),
  });
}

// --- Egalar va taklif havolasi ---

export function useBusinessOwners(businessId: string) {
  return useQuery({
    queryKey: changeKeys.owners(businessId),
    queryFn: () =>
      call(
        browserApi.GET("/admin/businesses/{businessId}/owners", {
          params: { path: { businessId } },
        }),
      ),
  });
}

function useRefreshOwners(businessId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: changeKeys.owners(businessId) });
    void queryClient.invalidateQueries({ queryKey: changeKeys.all });
  };
}

export function useCreateOwnerInvite(businessId: string) {
  const refresh = useRefreshOwners(businessId);
  return useMutation({
    mutationFn: () =>
      call(
        browserApi.POST("/admin/businesses/{businessId}/owner-invite", {
          params: { path: { businessId } },
        }),
      ),
    onSuccess: refresh,
  });
}

export function useRevokeOwnerInvite(businessId: string) {
  const refresh = useRefreshOwners(businessId);
  return useMutation({
    mutationFn: () =>
      call(
        browserApi.DELETE("/admin/businesses/{businessId}/owner-invite", {
          params: { path: { businessId } },
        }),
      ),
    onSettled: refresh,
  });
}

export function useRemoveOwner(businessId: string) {
  const refresh = useRefreshOwners(businessId);
  return useMutation({
    mutationFn: (membershipId: string) =>
      call(
        browserApi.DELETE("/admin/businesses/{businessId}/owners/{membershipId}", {
          params: { path: { businessId, membershipId } },
        }),
      ),
    onSettled: refresh,
  });
}
