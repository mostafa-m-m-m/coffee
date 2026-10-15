"use client";

import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { useConfirm } from "@/hooks/use-confirm";

const FOCUSABLE = "button:not([disabled])";

/** Renders the dialog behind `confirmDialog()`. Mounted once, in the providers. */
export function ConfirmHost() {
  const options = useConfirm((s) => s.options);
  const answer = useConfirm((s) => s.answer);
  const panel = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const t = useTranslations("Common");

  useEffect(() => {
    if (!options) return;
    const previous = document.activeElement as HTMLElement | null;
    cancel.current?.focus(); // the safe choice has focus, so Enter never destroys by accident
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return answer(false);
      if (e.key !== "Tab") return;
      const items = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [options, answer]);

  if (!options) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <button
        type="button"
        aria-label={t("cancel")}
        tabIndex={-1}
        onClick={() => answer(false)}
        className="absolute inset-0 bg-scrim"
      />
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-lg font-semibold">
          {options.title}
        </h2>
        <p id="confirm-message" className="mt-2 text-sm text-muted">
          {options.message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            ref={cancel}
            type="button"
            onClick={() => answer(false)}
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            {options.cancelLabel ?? t("cancel")}
          </button>
          <button
            type="button"
            onClick={() => answer(true)}
            className={`rounded-md px-4 py-2 font-medium ${
              options.danger
                ? "bg-danger text-danger-fg hover:opacity-90"
                : "bg-accent text-accent-fg hover:bg-accent-hover"
            }`}
          >
            {options.confirmLabel ?? t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
