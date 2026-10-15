"use client";

import { useTranslations } from "next-intl";
import type { ErrorParams } from "@/lib/api-error";

type ApiErrorLike = { code?: string; params?: ErrorParams } | null | undefined;

/**
 * Turns the codes the API (and Zod schemas) return into text in the current locale:
 *  - `api(error)`   -> `Errors.api.<code>` with its params (status params are translated too)
 *  - `field(key)`   -> `Errors.<key>`, e.g. "validation.nameShort"
 */
export function useErrorText() {
  const t = useTranslations("Errors");
  const tStatus = useTranslations("Common.status");

  const has = (key: string) => t.has(key as never);
  const render = (key: string, params?: ErrorParams) => t(key as never, params as never);

  return {
    api(error: ApiErrorLike) {
      const key = `api.${error?.code}`;
      if (!error?.code || !has(key)) return t("api.INTERNAL");
      const params = { ...error.params };
      if (error.code === "INVALID_TRANSITION") {
        for (const k of ["from", "to"]) params[k] = tStatus(String(params[k]) as never);
      }
      return render(key, params);
    },
    field(key: string | undefined) {
      if (!key) return undefined;
      return has(key) ? render(key) : t("api.VALIDATION");
    },
  };
}
