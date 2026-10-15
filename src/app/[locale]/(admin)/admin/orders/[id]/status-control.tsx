"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useErrorText } from "@/hooks/use-error-text";
import { useRouter } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";
import { confirmDialog } from "@/hooks/use-confirm";
import { toast } from "@/hooks/use-toast";
import type { ORDER_STATUSES } from "@/lib/validations/admin-orders";

type Status = (typeof ORDER_STATUSES)[number];

const DESTRUCTIVE = ["CANCELLED", "REFUNDED"];

export function StatusControl({
  orderId,
  current,
  options,
}: {
  orderId: string;
  current: string;
  options: string[];
}) {
  const t = useTranslations("Admin.orderDetail");
  const tStatus = useTranslations("Common.status");
  const text = useErrorText();
  const router = useRouter();
  const [next, setNext] = useState(options[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted">
        {t("noTransitions", { status: tStatus(current as Status) })}
      </p>
    );
  }

  async function apply() {
    if (
      DESTRUCTIVE.includes(next) &&
      !(await confirmDialog({
        title: t("confirmTitle"),
        message: t("confirmMessage", { status: tStatus(next as Status) }),
        confirmLabel: t("confirmLabel"),
        danger: true,
      }))
    )
      return;
    setBusy(true);
    setMessage(undefined);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = (await res.json()) as ApiErrorBody;
      const failure = text.api(error);
      setMessage({ ok: false, text: failure });
      toast.error(failure);
      return;
    }
    setMessage({ ok: true, text: t("updated") });
    toast.success(t("updatedToast", { status: tStatus(next as Status) }));
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <label htmlFor="next-status" className="block text-sm">
        {t("changeTo")}
      </label>
      <select
        id="next-status"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        className="w-full rounded-md border border-border bg-card px-3 py-2"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {tStatus(o as Status)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={busy}
        onClick={apply}
        className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full")}
      >
        {busy ? t("saving") : t("apply")}
      </button>
      {message && (
        <p role="status" className={`text-sm ${message.ok ? "text-success" : "text-danger"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
