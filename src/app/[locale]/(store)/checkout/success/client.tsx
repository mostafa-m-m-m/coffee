"use client";

import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";

/** The order went through: the cart it was made from is now empty. */
export function ClearCart() {
  const clear = useCart((s) => s.clear);
  useEffect(() => clear(), [clear]);
  return null;
}
