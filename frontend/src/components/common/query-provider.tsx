"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserApiError } from "@/lib/api/browser";

/** Brauzer tomonidagi so'rovlar keshi (foydalanuvchi holati, sevimlilar, sharhlar) */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            // 4xx xatolar (401, 404...) qayta urinish bilan tuzalmaydi
            retry: (count, error) =>
              !(error instanceof BrowserApiError && error.status < 500) && count < 2,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
