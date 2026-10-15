"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * A panel that slides over the page from the end edge (the right in English, the left in Arabic)
 * or from the bottom, on a dimmed backdrop. It is a modal dialog: Escape and a click on the
 * backdrop close it, focus moves into it when it opens and returns to the trigger when it closes,
 * and the page behind does not scroll.
 */
export function Sheet({
  open,
  onClose,
  title,
  closeLabel,
  side = "end",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** names the dialog for assistive technology */
  title: string;
  closeLabel: string;
  side?: "end" | "bottom";
  className?: string;
  children: React.ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const lock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = lock;
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "absolute flex flex-col gap-4 overflow-y-auto bg-card p-5 outline-none",
          side === "end"
            ? "inset-y-0 end-0 w-full max-w-md border-s border-border"
            : "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t border-border",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
