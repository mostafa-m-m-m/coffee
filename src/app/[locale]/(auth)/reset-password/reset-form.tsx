"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useErrorText } from "@/hooks/use-error-text";
import { Link } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";
import { resetSchema } from "@/lib/validations/auth";

type Values = { password: string };

export function ResetForm() {
  const t = useTranslations("Auth");
  const text = useErrorText();
  const token = useSearchParams().get("token") ?? "";
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(resetSchema.pick({ password: true })),
    mode: "onTouched",
  });

  if (!token) {
    return (
      <div className="flex flex-col gap-3">
        <p role="alert" className="text-danger">
          {t("reset.missing")}
        </p>
        <Link href="/forgot-password" className="underline">
          {t("reset.newLink")}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-3">
        <p role="status">{t("reset.done")}</p>
        <Link href="/login" className="underline">
          {t("reset.toLogin")}
        </Link>
      </div>
    );
  }

  async function submit(v: Values) {
    setServerError(undefined);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: v.password }),
    });
    if (!res.ok) {
      setServerError(text.api(((await res.json()) as ApiErrorBody).error));
      return;
    }
    setDone(true);
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="password">{t("fields.password")}</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="w-full rounded-md border border-border bg-card px-3 py-2"
          {...register("password")}
        />
        {errors.password && (
          <p role="alert" className="text-sm text-danger">
            {text.field(errors.password.message)}
          </p>
        )}
      </div>
      {serverError && (
        <div className="flex flex-col gap-1">
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
          <Link href="/forgot-password" className="text-sm underline">
            {t("reset.newLink")}
          </Link>
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full")}
      >
        {t("reset.submit")}
      </button>
    </form>
  );
}
