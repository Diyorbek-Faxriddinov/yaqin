"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { useMe } from "@/features/auth/use-me";
import { browserApi, call } from "@/lib/api/browser";
import type { BusinessSummary } from "@/lib/api/types";

export const favoriteIdsKey = ["favorites", "ids"] as const;
export const favoritesListKey = (locale: string) => ["favorites", "list", locale] as const;

/** Sevimli bizneslar ID'lari (faqat kirgan foydalanuvchi uchun so'raladi) */
export function useFavoriteIds() {
  const { data: me } = useMe();
  return useQuery({
    queryKey: favoriteIdsKey,
    queryFn: () => call(browserApi.GET("/me/favorites/ids")),
    enabled: Boolean(me),
    select: (ids) => new Set(ids),
  });
}

export function useFavoritesList() {
  const locale = useLocale();
  return useQuery({
    queryKey: favoritesListKey(locale),
    queryFn: (): Promise<BusinessSummary[]> =>
      call(browserApi.GET("/me/favorites", { params: { query: { lang: locale as "uz" | "ru" } } })),
  });
}

/** Optimistik yangilash: yurakcha darhol o'zgaradi, xato bo'lsa — avvalgi holatiga qaytadi */
export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ businessId, add }: { businessId: string; add: boolean }) => {
      const params = { params: { path: { businessId } } };
      if (add) await call(browserApi.PUT("/me/favorites/{businessId}", params));
      else await call(browserApi.DELETE("/me/favorites/{businessId}", params));
    },
    onMutate: async ({ businessId, add }) => {
      await queryClient.cancelQueries({ queryKey: favoriteIdsKey });
      const previous = queryClient.getQueryData<string[]>(favoriteIdsKey);
      queryClient.setQueryData<string[]>(favoriteIdsKey, (ids = []) =>
        add ? [...new Set([...ids, businessId])] : ids.filter((id) => id !== businessId),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(favoriteIdsKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
