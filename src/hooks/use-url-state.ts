"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Table/filter state lives in the URL, so views are shareable and survive refresh.
 * `patch` values: undefined/""/[] remove the key. Any change except `page` itself resets to page 1.
 */
export function useUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const patch = useCallback(
    (changes: Record<string, string | number | string[] | undefined>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        const value = Array.isArray(v) ? v.join(",") : v === undefined ? "" : String(v);
        if (value === "") next.delete(k);
        else next.set(k, value);
      }
      if (!("page" in changes)) next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const clear = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      for (const k of keep) if (params.has(k)) next.set(k, params.get(k)!);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  return { params, patch, clear };
}
