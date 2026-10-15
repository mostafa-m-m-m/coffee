"use client";

import { Icon } from "@/components/ui/icon";
import { useTranslations } from "next-intl";
import { useToasts } from "@/hooks/use-toast";

/** Always mounted so screen readers have a live region to announce into. */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  const t = useTranslations("Common");

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.kind === "error" ? "alert" : undefined}
          data-toast={item.kind}
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg ${
            item.kind === "error" ? "border-danger" : "border-border"
          }`}
        >
          <span
            aria-hidden
            className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${
              item.kind === "error" ? "bg-danger text-danger-fg" : "bg-success text-success-fg"
            }`}
          >
            <Icon name={item.kind === "error" ? "close" : "check"} size={14} strokeWidth={2.5} />
          </span>
          <p className="flex-1">{item.message}</p>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label={t("dismissNotification")}
            className="-m-2 grid size-9 place-items-center rounded-md text-muted hover:bg-border"
          >
            <Icon name="close" />
          </button>
        </div>
      ))}
    </div>
  );
}
