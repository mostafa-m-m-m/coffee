"use client";

import { inputVariants } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useErrorText } from "@/hooks/use-error-text";
import { Link } from "@/i18n/navigation";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { PasswordField } from "@/components/password-field";
import { authClient } from "@/lib/auth-client";
import { demoLoginAction, loginAction } from "../actions";

const field = cn(inputVariants(), "w-full");
const btn = cn(buttonVariants(), "w-full");

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const t = useTranslations("Auth");
  const text = useErrorText();
  const locale = useLocale();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? `/${locale}`;
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), mode: "onTouched" });

  async function submit(v: LoginInput, redirectTo = callbackUrl) {
    setServerError(undefined);
    const res = await loginAction(v.email, v.password, redirectTo);
    if (res?.error) setServerError(text.api({ code: res.error }));
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit((v) => submit(v))} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1">
          <label htmlFor="email">{t("fields.email")}</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={field}
            {...register("email")}
          />
          {errors.email && (
            <p role="alert" className="text-sm text-danger">
              {text.field(errors.email.message)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password">{t("fields.password")}</label>
          <PasswordField
            id="password"
            autoComplete="current-password"
            className={field}
            {...register("password")}
          />
          {errors.password && (
            <p role="alert" className="text-sm text-danger">
              {text.field(errors.password.message)}
            </p>
          )}
          <Link href="/forgot-password" className="text-sm underline">
            {t("login.forgot")}
          </Link>
        </div>
        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}
        {/* mouse-down must not blur the field: its error message would shift the button and eat the click */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={btn}
          onMouseDown={(e) => e.preventDefault()}
        >
          {t("login.submit")}
        </button>
      </form>

      {googleEnabled && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: callbackUrl })}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
        >
          {t("login.google")}
        </button>
      )}
      <div className="flex items-center gap-3 text-xs text-muted" role="separator">
        <span className="h-px flex-1 bg-border" />
        {t("login.demoDivider")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["customer", "viewer"] as const).map((as) => (
          <button
            key={as}
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              setServerError(undefined);
              const res = await demoLoginAction(as, locale);
              if (res?.error) setServerError(text.api({ code: res.error }));
            }}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            {t(as === "customer" ? "login.demoCustomer" : "login.demo")}
          </button>
        ))}
      </div>

      <p className="text-sm">
        {t("login.noAccount")}{" "}
        <Link href="/register" className="underline">
          {t("login.toRegister")}
        </Link>
      </p>
    </div>
  );
}
