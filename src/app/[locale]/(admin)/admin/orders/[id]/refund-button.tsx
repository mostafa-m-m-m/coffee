"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { confirmDialog } from "@/hooks/use-confirm";
import { useErrorText } from "@/hooks/use-error-text";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";

/** Refund of a paid order: asks first, because it cannot be undone. */
export function RefundButton({ orderId }: { orderId: string }) {
  const t = useTranslations("Admin.orderDetail.refund");
  const text = useErrorText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function refund() {
    const ok = await confirmDialog({
      title: t("confirmTitle"),
      message: t("confirmMessage"),
      confirmLabel: t("confirmLabel"),
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${orderId}/refund`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      toast.error(text.api(((await res.json()) as ApiErrorBody).error));
      return;
    }
    toast.success(t("done"));
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={refund}
      className="w-full rounded-md border border-danger px-3 py-2 text-danger disabled:opacity-50"
    >
      {busy ? t("working") : t("button")}
    </button>
  );
}
