"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useErrorText } from "@/hooks/use-error-text";
import { Link } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";
import { forgotSchema } from "@/lib/validations/auth";

type Values = z.infer<typeof forgotSchema>;

export function ForgotForm() {
  const t = useTranslations("Auth");
  const text = useErrorText();
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(forgotSchema), mode: "onTouched" });

  async function submit(v: Values) {
    setServerError(undefined);
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (!res.ok) {
      setServerError(text.api(((await res.json()) as ApiErrorBody).error));
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {sent ? (
        <p role="status">{t("forgot.sent")}</p>
      ) : (
        <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
          <p className="text-muted">{t("forgot.text")}</p>
          <div className="flex flex-col gap-1">
            <label htmlFor="email">{t("fields.email")}</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              {...register("email")}
            />
            {errors.email && (
              <p role="alert" className="text-sm text-danger">
                {text.field(errors.email.message)}
              </p>
            )}
          </div>
          {serverError && (
            <p role="alert" className="text-sm text-danger">
              {serverError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full")}
          >
            {t("forgot.submit")}
          </button>
        </form>
      )}
      <Link href="/login" className="text-sm underline">
        {t("forgot.back")}
      </Link>
    </div>
  );
}
