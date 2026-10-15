"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/hooks/use-cart";

/**
 * Keeps the local (Zustand) cart and the account cart in sync.
 * On first render while logged in: pull the server cart, merge with the local one, push back.
 * After that: debounce-push every local change.
 */
export function CartSync({ loggedIn }: { loggedIn: boolean }) {
  const lines = useCart((s) => s.lines);
  const ready = useRef(false);

  useEffect(() => {
    if (!loggedIn) {
      ready.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cart");
        if (!res.ok || cancelled) return;
        const { items } = await res.json();
        useCart.getState().merge(items);
      } finally {
        if (!cancelled) ready.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  useEffect(() => {
    if (!loggedIn || !ready.current) return;
    const t = setTimeout(() => {
      fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines }),
      });
    }, 500);
    return () => clearTimeout(t);
  }, [lines, loggedIn]);

  return null;
}
