"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Price } from "@/components/price";
import { useErrorText } from "@/hooks/use-error-text";
import { useMounted } from "@/hooks/use-mounted";
import { Link, useRouter } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";

type Values = { number: string; expiry: string; cvc: string; name: string };
type Failure = "declined" | "insufficient_funds" | "out_of_stock" | "expired" | null;

const input = cn(inputVariants(), "w-full");

// the test cards printed on the page, so a reviewer never has to guess
const TEST_CARDS = [
  { number: "4242 4242 4242 4242", key: "succeeds" },
  { number: "4000 0000 0000 0002", key: "declined" },
  { number: "4000 0000 0000 9995", key: "insufficient" },
] as const;

const groups = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
const expiry = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
};

export function PayForm({
  reference,
  totalCents,
  expiresAt,
}: {
  reference: string;
  locale: string;
  totalCents: number;
  expiresAt: string | null;
}) {
  const t = useTranslations("Store.pay");
  const text = useErrorText();
  const f = useFormatter();
  const router = useRouter();
  const mounted = useMounted();
  const [reported, setFailure] = useState<Failure>(null);
  const [serverError, setServerError] = useState<string>();
  const [left, setLeft] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ mode: "onTouched" });

  // seconds until the session ends, ticking once a second
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () =>
      setLeft(Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  async function submit(v: Values) {
    setFailure(null);
    setServerError(undefined);
    const res = await fetch("/api/payments/pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref: reference, ...v }),
    });
    const body = await res.json();
    if (!res.ok) {
      const { error } = body as ApiErrorBody;
      for (const [k, key] of Object.entries(error.fields ?? {}))
        setError(k as keyof Values, { message: key });
      if (!error.fields) setServerError(text.api(error));
      return;
    }
    if (body.outcome === "paid" || body.outcome === "already_processed") {
      router.replace({ pathname: "/checkout/success", query: { order: body.orderId } });
    } else if (body.outcome === "out_of_stock" || body.outcome === "expired") {
      setFailure(body.outcome);
    } else {
      setFailure(body.reason === "insufficient_funds" ? "insufficient_funds" : "declined");
    }
  }

  const failure: Failure = left === 0 ? "expired" : reported;

  const clock =
    left === null || !mounted
      ? "—"
      : `${f.number(Math.floor(left / 60), "twoDigits")}:${f.number(left % 60, "twoDigits")}`;

  if (failure === "expired" || failure === "out_of_stock") {
    return (
      <div
        role="alert"
        className="space-y-4 rounded-xl border border-border bg-card p-6 text-center"
      >
        <h1 className="text-xl font-bold">
          {failure === "expired" ? t("expiredTitle") : t("outOfStockTitle")}
        </h1>
        <p className="text-muted">
          {failure === "expired" ? t("expiredHint") : t("outOfStockHint")}
        </p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "inline-block")}
        >
          {t("backToStore")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit(submit)}
        noValidate
        className="space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <h1 className="sr-only">{t("title")}</h1>
        {expiresAt && (
          <p className="text-sm text-muted" role="timer" aria-live="off">
            {t("expiresIn")}{" "}
            <span className="font-mono font-semibold text-foreground">{clock}</span>
          </p>
        )}

        <div className="space-y-1">
          <label htmlFor="number" className="text-sm font-medium">
            {t("cardNumber")}
          </label>
          <input
            id="number"
            dir="ltr"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="4242 4242 4242 4242"
            className={`${input} font-mono`}
            aria-invalid={!!errors.number}
            {...register("number", {
              required: "validation.cardNumberRequired",
              onChange: (e) => setValue("number", groups(e.target.value)),
            })}
          />
          {errors.number && (
            <p role="alert" className="text-sm text-danger">
              {text.field(errors.number.message)}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="expiry" className="text-sm font-medium">
              {t("expiry")}
            </label>
            <input
              id="expiry"
              dir="ltr"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM / YY"
              className={`${input} font-mono`}
              aria-invalid={!!errors.expiry}
              {...register("expiry", {
                required: "validation.cardExpiryInvalid",
                pattern: {
                  value: /^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/,
                  message: "validation.cardExpiryInvalid",
                },
                onChange: (e) => setValue("expiry", expiry(e.target.value)),
              })}
            />
            {errors.expiry && (
              <p role="alert" className="text-sm text-danger">
                {text.field(errors.expiry.message)}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <label htmlFor="cvc" className="text-sm font-medium">
              CVC
            </label>
            <input
              id="cvc"
              dir="ltr"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              className={`${input} font-mono`}
              aria-invalid={!!errors.cvc}
              {...register("cvc", {
                required: "validation.cardCvcInvalid",
                pattern: { value: /^\d{3,4}$/, message: "validation.cardCvcInvalid" },
              })}
            />
            {errors.cvc && (
              <p role="alert" className="text-sm text-danger">
                {text.field(errors.cvc.message)}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            {t("nameOnCard")}
          </label>
          <input
            id="name"
            autoComplete="cc-name"
            className={input}
            aria-invalid={!!errors.name}
            {...register("name", {
              required: "validation.nameShort",
              minLength: { value: 2, message: "validation.nameShort" },
            })}
          />
          {errors.name && (
            <p role="alert" className="text-sm text-danger">
              {text.field(errors.name.message)}
            </p>
          )}
        </div>

        {(failure === "declined" || failure === "insufficient_funds") && (
          <p role="alert" className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
            {failure === "declined" ? t("declined") : t("insufficient")} {t("tryAgain")}
          </p>
        )}
        {serverError && (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        )}

        <button
          disabled={isSubmitting}
          onMouseDown={(e) => e.preventDefault()}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full")}
        >
          {isSubmitting
            ? t("paying")
            : t.rich("pay", { amount: () => <Price cents={totalCents} /> })}
        </button>
      </form>

      <section
        aria-labelledby="test-cards"
        className="rounded-xl border border-border bg-card p-4 text-sm"
      >
        <h2 id="test-cards" className="mb-2 font-semibold">
          {t("testCardsTitle")}
        </h2>
        <ul className="space-y-1">
          {TEST_CARDS.map((c) => (
            <li key={c.number} className="flex flex-wrap items-center justify-between gap-2">
              <code dir="ltr" className="font-mono">
                {c.number}
              </code>
              <span className="text-muted">{t(`testCards.${c.key}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-muted">{t("testCardsHint")}</p>
      </section>
    </>
  );
}
