"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Brauzerda React "jonlangan"mi (serverda va hydration paytida — false) */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
