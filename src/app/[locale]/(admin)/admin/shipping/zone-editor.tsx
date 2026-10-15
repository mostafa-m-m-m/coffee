"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useErrorText } from "@/hooks/use-error-text";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";
import { GOVERNORATES } from "@/lib/geo";

const input = cn(inputVariants(), "w-full");

/** "Edit" button + side sheet for one shipping zone: fee, delivery days and its governorates. */
export function ZoneEditor({
  id,
  name,
  feeCents,
  etaDays,
  governorates,
}: {
  id: string;
  name: string;
  feeCents: number;
  etaDays: number;
  governorates: string[];
}) {
  const t = useTranslations("Admin.shipping");
  const tc = useTranslations("Common");
  const tg = useTranslations("Common.governorates");
  const text = useErrorText();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(String(feeCents / 100));
  const [days, setDays] = useState(String(etaDays));
  const [selected, setSelected] = useState(new Set(governorates));
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function openSheet() {
    setFee(String(feeCents / 100));
    setDays(String(etaDays));
    setSelected(new Set(governorates));
    setErrors({});
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    const res = await fetch(`/api/admin/shipping-zones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fee: Number(fee),
        etaDays: Number(days),
        governorates: [...selected],
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = (await res.json()) as ApiErrorBody;
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(error?.fields ?? {})) next[k] = text.field(v) ?? "";
      setErrors(next);
      if (!Object.keys(next).length) toast.error(text.api(error));
      return;
    }
    toast.success(t("saved"));
    setOpen(false);
    router.refresh();
  }

  const toggle = (g: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(g)) n.delete(g);
      else n.add(g);
      return n;
    });

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={buttonVariants({ variant: "secondary", size: "sm" })}
        aria-label={t("editZone", { name })}
      >
        {t("edit")}
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("editZone", { name })}
        closeLabel={tc("close")}
      >
        <form onSubmit={save} className="flex min-h-full flex-col gap-4">
          <h2 className="text-lg font-semibold">{name}</h2>
          <div>
            <label htmlFor="zone-fee" className="mb-1 block text-sm font-medium">
              {t("feeLabel")}
            </label>
            <input
              id="zone-fee"
              ref={firstRef}
              type="number"
              min={0}
              step="0.5"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className={input}
              aria-invalid={!!errors.fee}
            />
            {errors.fee && <p className="mt-1 text-sm text-danger">{errors.fee}</p>}
          </div>
          <div>
            <label htmlFor="zone-days" className="mb-1 block text-sm font-medium">
              {t("daysLabel")}
            </label>
            <input
              id="zone-days"
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={input}
              aria-invalid={!!errors.etaDays}
            />
            {errors.etaDays && <p className="mt-1 text-sm text-danger">{errors.etaDays}</p>}
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">{t("governoratesLabel")}</legend>
            <div className="grid grid-cols-2 gap-1 text-sm">
              {GOVERNORATES.map((g) => (
                <label key={g} className="flex items-center gap-2 rounded px-1 py-0.5">
                  <input type="checkbox" checked={selected.has(g)} onChange={() => toggle(g)} />
                  {tg(g)}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{t("governoratesHint")}</p>
            {errors.governorates && (
              <p className="mt-1 text-sm text-danger" role="alert">
                {errors.governorates}
              </p>
            )}
          </fieldset>
          <div className="mt-auto flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className={cn(buttonVariants({ variant: "primary", size: "md" }), "flex-1")}
            >
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className={buttonVariants({ variant: "secondary", size: "md" })}
            >
              {tc("cancel")}
            </button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
