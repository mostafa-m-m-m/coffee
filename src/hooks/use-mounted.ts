"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false during SSR/hydration, true afterwards — for UI that depends on localStorage state. */
export function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
