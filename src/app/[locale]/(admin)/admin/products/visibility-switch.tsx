"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useErrorText } from "@/hooks/use-error-text";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";
import { cn } from "@/lib/cn";

/** Show or hide a product in the store from the table row. Updates at once and rolls back on failure. */
export function VisibilitySwitch({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const t = useTranslations("Admin.products");
  const text = useErrorText();
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [busy, setBusy] = useState(false);

  async function flip() {
    const next = !on;
    setOn(next);
    setBusy(true);
    const res = await fetch(`/api/admin/products/${id}/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setOn(!next);
      toast.error(text.api(((await res.json()) as ApiErrorBody).error));
      return;
    }
    toast.success(next ? t("shownToast") : t("hiddenToast"));
    router.refresh();
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={t("visibilityOf", { name })}
      disabled={busy}
      onClick={flip}
      className="inline-flex min-h-11 items-center gap-2 text-sm disabled:opacity-60"
    >
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full border transition-colors",
          on ? "border-accent bg-accent" : "border-border bg-surface-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4.5 rounded-full bg-card shadow transition-all",
            on ? "start-[1.125rem]" : "start-0.5",
          )}
        />
      </span>
      {on ? t("visible") : t("hidden")}
    </button>
  );
}
