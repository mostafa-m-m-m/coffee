"use client";

import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";
import { track } from "@/lib/track";

/** "Add to cart" on a product card, for products with a single variant. */
export function QuickAdd({ variantId, productId }: { variantId: string; productId: string }) {
  const t = useTranslations("Store.product");
  const add = useCart((s) => s.add);
  return (
    <button
      type="button"
      onClick={() => {
        add(variantId);
        track("ADD_TO_CART", productId);
        toast.success(t("addedToast"));
      }}
      className={buttonVariants({
        variant: "secondary",
        size: "sm",
        className: "relative z-10 mt-2 w-full",
      })}
    >
      {t("add")}
    </button>
  );
}
