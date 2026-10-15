"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useErrorText } from "@/hooks/use-error-text";
import { Link } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { PasswordField } from "@/components/password-field";
import { loginAction } from "../actions";

const field = cn(inputVariants(), "w-full");

export function RegisterForm() {
  const t = useTranslations("Auth");
  const text = useErrorText();
  const locale = useLocale();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema), mode: "onTouched" });

  async function submit(v: RegisterInput) {
    setServerError(undefined);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, locale }),
    });
    if (!res.ok) {
      const { error } = (await res.json()) as ApiErrorBody;
      for (const [k, key] of Object.entries(error.fields ?? {}))
        setError(k as keyof RegisterInput, { message: key });
      if (!error.fields) setServerError(text.api(error));
      return;
    }
    await loginAction(v.email, v.password, `/${locale}`);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      {(["name", "email", "password"] as const).map((name) => (
        <div key={name} className="flex flex-col gap-1">
          <label htmlFor={name}>{t(`fields.${name}`)}</label>
          {name === "password" ? (
            <PasswordField
              id={name}
              autoComplete="new-password"
              className={field}
              {...register(name)}
            />
          ) : (
            <input
              id={name}
              type={name}
              autoComplete={name}
              className={field}
              {...register(name)}
            />
          )}
          {errors[name] && (
            <p role="alert" className="text-sm text-danger">
              {text.field(errors[name]?.message)}
            </p>
          )}
        </div>
      ))}
      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        onMouseDown={(e) => e.preventDefault()} // keep the click from being lost to a layout shift
        className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full")}
      >
        {t("register.submit")}
      </button>
      <p className="text-sm">
        {t("register.haveAccount")}{" "}
        <Link href="/login" className="underline">
          {t("register.toLogin")}
        </Link>
      </p>
    </form>
  );
}
