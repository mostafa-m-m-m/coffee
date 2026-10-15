"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Price } from "@/components/price";
import { SubscribeForm } from "@/components/store/subscribe-form";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/track";

type Variant = { id: string; name: string; priceCents: number; stock: number };

export function VariantPicker({
  productId,
  variants,
  cairoDays,
  freeShippingCents,
}: {
  productId: string;
  productName: string;
  variants: Variant[];
  /** delivery time to Cairo, from the shipping zones */
  cairoDays?: number;
  freeShippingCents: number;
}) {
  const t = useTranslations("Store.product");
  const tSubscribe = useTranslations("Store.subscribe");
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable.id);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines.find((l) => l.variantId === selectedId)?.quantity ?? 0);

  const v = variants.find((x) => x.id === selectedId)!;
  const out = v.stock <= 0;
  const maxReached = inCart >= v.stock;
  const room = Math.max(0, v.stock - inCart); // what can still be added
  const wanted = Math.min(qty, Math.max(room, 1));
  const label = out ? t("soldOut") : maxReached ? t("maxReached") : t("add");

  function addToCart() {
    add(v.id, wanted);
    setQty(1);
    track("ADD_TO_CART", productId);
    setAdded(true);
    toast.success(t("addedToast"));
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-2 font-medium">{t("chooseVariant")}</legend>
        <div className="flex flex-wrap gap-2">
          {variants.map((x) => (
            <label
              key={x.id}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                x.id === selectedId
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-card"
              } ${x.stock <= 0 ? "opacity-50" : ""}`}
            >
              <input
                type="radio"
                name="variant"
                value={x.id}
                checked={x.id === selectedId}
                onChange={() => {
                  setSelectedId(x.id);
                  setQty(1);
                  setAdded(false);
                }}
                className="sr-only"
              />
              {x.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <p className="font-mono text-2xl font-semibold">
          <Price cents={v.priceCents} />
        </p>
        <p className="text-xs text-muted">{t("vatIncluded")}</p>
      </div>
      <p
        className={`text-sm ${out ? "text-danger" : v.stock <= 5 ? "text-warning" : "text-muted"}`}
      >
        {out ? t("outOfStock") : v.stock <= 5 ? t("onlyLeft", { count: v.stock }) : t("inStock")}
      </p>

      {!out && (
        <div className="flex items-center gap-2" role="group" aria-label={t("quantity")}>
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={wanted <= 1}
            aria-label={t("decrease")}
            className="grid size-11 place-items-center rounded-md border border-border bg-card text-lg disabled:opacity-40"
          >
            −
          </button>
          <output className="w-10 text-center font-mono" aria-live="polite">
            {wanted}
          </output>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(room, q + 1))}
            disabled={wanted >= room}
            aria-label={t("increase")}
            className="grid size-11 place-items-center rounded-md border border-border bg-card text-lg disabled:opacity-40"
          >
            +
          </button>
        </div>
      )}

      <button
        type="button"
        disabled={out || maxReached}
        onClick={addToCart}
        className={cn(buttonVariants({ variant: "primary", size: "md" }), "hidden md:inline-flex")}
      >
        {label}
      </button>

      {cairoDays ? (
        <p className="text-sm text-muted">
          {t("shipsTo", { days: cairoDays })} ·{" "}
          {t.rich("freeShipping", { amount: () => <Price cents={freeShippingCents} /> })}
        </p>
      ) : null}
      <p role="status" className="min-h-5 text-sm text-success">
        {added ? t("added") : ""}
      </p>

      {out && (
        <div
          id="notify"
          className="scroll-mt-24 space-y-2 rounded-lg border border-border bg-card p-4"
        >
          <p className="font-medium">{tSubscribe("backInStockTitle")}</p>
          <SubscribeForm key={v.id} source="back-in-stock" variantId={v.id} />
        </div>
      )}

      {/* phones: price and the primary action stay within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 md:hidden">
        <Price cents={v.priceCents} className="text-xl font-semibold" />
        <button
          type="button"
          disabled={out || maxReached}
          onClick={addToCart}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "flex-1")}
        >
          {label}
        </button>
      </div>
    </div>
  );
}
