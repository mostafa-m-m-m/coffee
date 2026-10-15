"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = { variantId: string; quantity: number };

type CartState = {
  lines: CartLine[];
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /**
   * Merge another cart in (a guest logging in, or the account cart on page load).
   * Both sides can hold the very same lines, so the larger quantity wins instead of adding up:
   * merging twice must change nothing.
   */
  merge: (other: CartLine[]) => void;
};

const MAX_QTY = 99;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (variantId, quantity = 1) =>
        set((s) => {
          const found = s.lines.find((l) => l.variantId === variantId);
          return {
            lines: found
              ? s.lines.map((l) =>
                  l.variantId === variantId
                    ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + quantity) }
                    : l,
                )
              : [...s.lines, { variantId, quantity }],
          };
        }),
      setQuantity: (variantId, quantity) =>
        set((s) => ({
          lines:
            quantity <= 0
              ? s.lines.filter((l) => l.variantId !== variantId)
              : s.lines.map((l) =>
                  l.variantId === variantId ? { ...l, quantity: Math.min(MAX_QTY, quantity) } : l,
                ),
        })),
      remove: (variantId) =>
        set((s) => ({ lines: s.lines.filter((l) => l.variantId !== variantId) })),
      clear: () => set({ lines: [] }),
      merge: (other) =>
        set((s) => {
          const map = new Map(s.lines.map((l) => [l.variantId, l.quantity]));
          let changed = false;
          for (const l of other) {
            const next = Math.min(MAX_QTY, Math.max(map.get(l.variantId) ?? 0, l.quantity));
            if (next !== map.get(l.variantId)) changed = true;
            map.set(l.variantId, next);
          }
          if (!changed) return s; // same lines: no new state, so nothing is pushed back to the server
          return { lines: [...map].map(([variantId, quantity]) => ({ variantId, quantity })) };
        }),
    }),
    { name: "coffee-cart", partialize: (s) => ({ lines: s.lines }) },
  ),
);
