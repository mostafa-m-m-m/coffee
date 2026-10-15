"use client";

import { create } from "zustand";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** destructive actions get a red confirm button */
  danger?: boolean;
};

type ConfirmState = {
  options?: ConfirmOptions;
  resolve?: (answer: boolean) => void;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  answer: (value: boolean) => void;
};

export const useConfirm = create<ConfirmState>((set, get) => ({
  ask(options) {
    // a second question while one is open cancels the first
    get().resolve?.(false);
    return new Promise<boolean>((resolve) => set({ options, resolve }));
  },
  answer(value) {
    get().resolve?.(value);
    set({ options: undefined, resolve: undefined });
  },
}));

/** Replacement for window.confirm: `if (!(await confirmDialog({...}))) return;` */
export const confirmDialog = (options: ConfirmOptions) => useConfirm.getState().ask(options);
