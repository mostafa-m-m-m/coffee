"use client";

import { create } from "zustand";

export type Toast = { id: number; kind: "success" | "error"; message: string };

type ToastState = {
  toasts: Toast[];
  push: (kind: Toast["kind"], message: string) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push(kind, message) {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, kind, message }] })); // keep at most 3
    // errors stay a little longer than confirmations
    setTimeout(() => get().dismiss(id), kind === "error" ? 6000 : 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Fire-and-forget notifications that survive navigation: `toast.success(t("saved"))`. */
export const toast = {
  success: (message: string) => useToasts.getState().push("success", message),
  error: (message: string) => useToasts.getState().push("error", message),
};
