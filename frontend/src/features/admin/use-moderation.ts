"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { browserApi, call } from "@/lib/api/browser";
import type {
  AdminAttribute,
  AdminBusinessRequest,
  AdminCategoryCreate,
  AdminCategoryUpdate,
  AdminComplaint,
  AdminReview,
  AdminUser,
} from "@/lib/api/types";
import type { ComplaintFilter, RequestFilter, ReviewFilter, UserFilter } from "./admin-params";
import { adminBusinessesKey } from "./use-admin-business";

type Lang = "uz" | "ru";
type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

const PAGE_SIZE = 20;

export const adminKeys = {
  reviews: ["admin", "reviews"] as const,
  complaints: ["admin", "complaints"] as const,
  requests: ["admin", "requests"] as const,
  users: ["admin", "users"] as const,
  categories: ["admin", "categories"] as const,
};

/** "Yana ko'rsatish" bilan sahifalangan ro'yxat */
function usePagedList<T>(key: QueryKey, fetchPage: (page: number) => Promise<Page<T>>) {
  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
  return {
    ...query,
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    total: query.data?.pages[0]?.total,
  };
}

/** Navbatdagi yozuvlar soni (bosh panel uchun) — ruxsat bo'lmasa so'rov yuborilmaydi */
export function useQueueCount(
  kind: "reviews" | "complaints" | "requests",
  enabled: boolean,
): number | undefined {
  const { data } = useQuery({
    queryKey: [...adminKeys[kind], "count"],
    enabled,
    queryFn: async () => {
      const query = { pageSize: 1 };
      const page =
        kind === "reviews"
          ? await call(
              browserApi.GET("/admin/reviews", {
                params: { query: { ...query, status: "pending" } },
              }),
            )
          : kind === "complaints"
            ? await call(
                browserApi.GET("/admin/complaints", {
                  params: { query: { ...query, status: "open" } },
                }),
              )
            : await call(
                browserApi.GET("/admin/business-requests", {
                  params: { query: { ...query, status: "new" } },
                }),
              );
      return page.total;
    },
  });
  return data;
}

// --- Sharhlar ---

export function useReviewQueue(filter: ReviewFilter) {
  return usePagedList<AdminReview>([...adminKeys.reviews, filter], (page) =>
    call(
      browserApi.GET("/admin/reviews", {
        params: { query: { status: filter, page, pageSize: PAGE_SIZE } },
      }),
    ),
  );
}

export function useModerateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      rejectionReason,
    }: {
      id: string;
      status: "published" | "rejected";
      rejectionReason?: string;
    }) =>
      call(
        browserApi.PATCH("/admin/reviews/{reviewId}", {
          params: { path: { reviewId: id } },
          body: { status, rejectionReason: rejectionReason ?? null },
        }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.reviews }),
  });
}

// --- Shikoyatlar ---

export function useComplaintQueue(filter: ComplaintFilter) {
  return usePagedList<AdminComplaint>([...adminKeys.complaints, filter], (page) =>
    call(
      browserApi.GET("/admin/complaints", {
        params: { query: { status: filter, page, pageSize: PAGE_SIZE } },
      }),
    ),
  );
}

export function useUpdateComplaint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      resolutionNote,
    }: {
      id: string;
      status: "in_review" | "resolved" | "rejected";
      resolutionNote?: string;
    }) =>
      call(
        browserApi.PATCH("/admin/complaints/{complaintId}", {
          params: { path: { complaintId: id } },
          body: { status, resolutionNote: resolutionNote ?? null },
        }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.complaints }),
  });
}

// --- Biznes so'rovlari ---

export function useRequestQueue(filter: RequestFilter) {
  const lang = useLocale() as Lang;
  return usePagedList<AdminBusinessRequest>([...adminKeys.requests, filter, lang], (page) =>
    call(
      browserApi.GET("/admin/business-requests", {
        params: { query: { lang, status: filter, page, pageSize: PAGE_SIZE } },
      }),
    ),
  );
}

export function useUpdateRequest() {
  const lang = useLocale() as Lang;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: string;
      status: "new" | "contacted" | "rejected";
      adminNote?: string | null;
    }) =>
      call(
        browserApi.PATCH("/admin/business-requests/{requestId}", {
          params: { path: { requestId: id }, query: { lang } },
          body: { status, ...(adminNote !== undefined ? { adminNote } : {}) },
        }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.requests }),
  });
}

export function useConvertRequest() {
  const lang = useLocale() as Lang;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: { name: string; categorySlug: string; districtSlug: string };
    }) =>
      call(
        browserApi.POST("/admin/business-requests/{requestId}/convert", {
          params: { path: { requestId: id }, query: { lang } },
          body,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.requests });
      void queryClient.invalidateQueries({ queryKey: adminBusinessesKey });
    },
  });
}

// --- Foydalanuvchilar ---

export function useUserList(filter: UserFilter, q: string) {
  return usePagedList<AdminUser>([...adminKeys.users, filter, q], (page) =>
    call(
      browserApi.GET("/admin/users", {
        params: {
          query: {
            q: q || undefined,
            blocked: filter === "blocked" ? true : undefined,
            page,
            pageSize: PAGE_SIZE,
          },
        },
      }),
    ),
  );
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isBlocked, reason }: { id: string; isBlocked: boolean; reason?: string }) =>
      call(
        browserApi.PATCH("/admin/users/{userId}", {
          params: { path: { userId: id } },
          body: { isBlocked, blockedReason: reason ?? null },
        }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: adminKeys.users }),
  });
}

// --- Kategoriyalar ---

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories,
    queryFn: () => call(browserApi.GET("/admin/categories")),
  });
}

/** Admin ro'yxati va ommaviy tanlash ro'yxatlari (biznes formasi) yangilanadi */
function useCategoryInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.categories });
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
  };
}

export function useCreateCategory() {
  const invalidate = useCategoryInvalidation();
  return useMutation({
    mutationFn: (body: AdminCategoryCreate) => call(browserApi.POST("/admin/categories", { body })),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useCategoryInvalidation();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminCategoryUpdate }) =>
      call(
        browserApi.PATCH("/admin/categories/{categoryId}", {
          params: { path: { categoryId: id } },
          body,
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteCategory() {
  const invalidate = useCategoryInvalidation();
  return useMutation({
    mutationFn: (id: string) =>
      call(
        browserApi.DELETE("/admin/categories/{categoryId}", {
          params: { path: { categoryId: id } },
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useSetAttributes(categoryId: string) {
  const invalidate = useCategoryInvalidation();
  return useMutation({
    mutationFn: (attributes: AdminAttribute[]) =>
      call(
        browserApi.PUT("/admin/categories/{categoryId}/attributes", {
          params: { path: { categoryId } },
          body: { attributes },
        }),
      ),
    onSuccess: invalidate,
  });
}
