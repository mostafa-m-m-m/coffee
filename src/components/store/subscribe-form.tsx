"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useErrorText } from "@/hooks/use-error-text";
import type { ApiErrorBody } from "@/lib/api-error";
import { locales } from "@/i18n/config";
import { emailOnlySchema, type SubscribeInput } from "@/lib/validations/subscribe";

type Values = Pick<SubscribeInput, "email">;

/** One email field + button. `source` says which list the visitor joins; copy comes from `Store.subscribe`. */
export function SubscribeForm({
  source,
  variantId,
}: {
  source: SubscribeInput["source"];
  variantId?: string;
}) {
  const t = useTranslations("Store.subscribe");
  const text = useErrorText();
  const locale = useLocale();
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(emailOnlySchema), mode: "onTouched" });

  async function submit(v: Values) {
    setServerError(undefined);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        source,
        variantId,
        locale: (locales as readonly string[]).includes(locale) ? locale : "ar",
      }),
    });
    if (!res.ok) {
      const { error } = (await res.json()) as ApiErrorBody;
      setServerError(text.api(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <p role="status" className="font-medium">
        {t(`done.${source}`)}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="w-full max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <label
            htmlFor={`subscribe-${source}${variantId ? `-${variantId}` : ""}`}
            className="sr-only"
          >
            {t("email")}
          </label>
          <input
            id={`subscribe-${source}${variantId ? `-${variantId}` : ""}`}
            type="email"
            autoComplete="email"
            placeholder={t("placeholder")}
            aria-invalid={!!errors.email}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-foreground"
            {...register("email")}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "disabled:opacity-60")}
        >
          {t(`button.${source}`)}
        </button>
      </div>
      {(errors.email || serverError) && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {errors.email ? text.field(errors.email.message) : serverError}
        </p>
      )}
    </form>
  );
}
