"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { browserApi, call } from "@/lib/api/browser";
import type { ReviewInput } from "@/lib/api/types";

export const myReviewsKey = ["me", "reviews"] as const;

export function useMyReviews() {
  return useQuery({ queryKey: myReviewsKey, queryFn: () => call(browserApi.GET("/me/reviews")) });
}

export function useCreateReview(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewInput) =>
      call(browserApi.POST("/businesses/{slug}/reviews", { params: { path: { slug } }, body })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: myReviewsKey }),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) =>
      call(browserApi.DELETE("/me/reviews/{reviewId}", { params: { path: { reviewId } } })),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: myReviewsKey }),
  });
}
