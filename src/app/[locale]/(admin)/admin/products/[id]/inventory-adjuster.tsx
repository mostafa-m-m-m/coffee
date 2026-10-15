"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useErrorText } from "@/hooks/use-error-text";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";

const input = inputVariants({ size: "sm" });

export function InventoryAdjuster({
  variantId,
  name,
  stock,
}: {
  variantId: string;
  name: string;
  stock: number;
}) {
  const t = useTranslations("Admin.inventory");
  const text = useErrorText();
  const router = useRouter();
  const [value, setValue] = useState(String(stock));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();

  async function save() {
    setBusy(true);
    setMsg(undefined);
    const res = await fetch(`/api/admin/inventory/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: Number(value), note }),
    });
    setBusy(false);
    const body = await res.json();
    if (!res.ok) {
      const { error } = body as ApiErrorBody;
      const failure = text.field(error?.fields?.note ?? error?.fields?.stock) ?? text.api(error);
      setMsg({ ok: false, text: failure });
      toast.error(failure);
      return;
    }
    setNote("");
    setValue(String(body.stock));
    const recorded =
      body.delta === 0
        ? t("noChange")
        : t("recorded", { delta: body.delta > 0 ? `+${body.delta}` : String(body.delta) });
    setMsg({ ok: true, text: recorded });
    toast.success(recorded);
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-end gap-3">
      <span className="w-40 text-sm">
        {name}
        <span className="block text-xs text-muted">{t("current", { stock })}</span>
      </span>
      <div className="flex flex-col gap-1">
        <label htmlFor={`s-${variantId}`} className="text-xs text-muted">
          {t("newStock")}
        </label>
        <input
          id={`s-${variantId}`}
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${input} w-28`}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`n-${variantId}`} className="text-xs text-muted">
          {t("reason")}
        </label>
        <input
          id={`n-${variantId}`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("reasonPlaceholder")}
          className={`${input} w-56`}
        />
      </div>
      <button
        type="button"
        disabled={busy || Number(value) === stock}
        onClick={save}
        className={buttonVariants({ variant: "primary", size: "sm" })}
      >
        {t("save")}
      </button>
      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-danger"}`}>
          {msg.text}
        </p>
      )}
    </li>
  );
}
