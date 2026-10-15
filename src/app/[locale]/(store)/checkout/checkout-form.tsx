"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Price } from "@/components/price";
import { useCart } from "@/hooks/use-cart";
import { useErrorText } from "@/hooks/use-error-text";
import { useMounted } from "@/hooks/use-mounted";
import { Link } from "@/i18n/navigation";
import type { ApiErrorBody } from "@/lib/api-error";
import { GOVERNORATES } from "@/lib/geo";
import { pick, type LocalizedText } from "@/lib/i18n/localized";
import { computeTotals } from "@/lib/pricing";
import { addressSchema, type AddressInput } from "@/lib/validations/address";

type VariantInfo = {
  id: string;
  variantName: LocalizedText;
  priceCents: number;
  stock: number;
  productName: LocalizedText;
  isActive: boolean;
};

export type CheckoutZone = {
  id: string;
  name: string; // already in the page's language
  governorates: string[];
  feeCents: number;
  etaDays: number;
};

const formSchema = addressSchema.extend({
  paymentMethod: z.enum(["CARD", "COD"], "validation.paymentMethodRequired"),
});
type FormValues = z.infer<typeof formSchema>;

const input = cn(inputVariants(), "w-full");

function Field({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${name}-err`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const TEXT_FIELDS = [
  { name: "fullName", wide: false },
  { name: "phone", type: "tel", wide: false },
  { name: "area", wide: false },
  { name: "street", wide: false },
  { name: "building", wide: false },
  { name: "notes", wide: true },
] as const;

export function CheckoutForm({
  defaults,
  zones,
}: {
  defaults: AddressInput;
  zones: CheckoutZone[];
}) {
  const t = useTranslations("Store.checkout");
  const tCart = useTranslations("Store.cart");
  const tGov = useTranslations("Common.governorates");
  const tMethod = useTranslations("Common.paymentMethod");
  const text = useErrorText();
  const locale = useLocale() as "ar" | "en";
  const mounted = useMounted();
  const lines = useCart((s) => s.lines);
  const ids = lines.map((l) => l.variantId).sort();
  const [serverError, setServerError] = useState<string>();

  const { data } = useQuery<VariantInfo[]>({
    queryKey: ["variants", ids],
    enabled: mounted && ids.length > 0,
    queryFn: async () => (await fetch(`/api/variants?ids=${ids.join(",")}`)).json(),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...defaults, paymentMethod: "CARD" },
    mode: "onTouched", // validate when the user leaves a field, not while typing
  });
  const governorate = useWatch({ control, name: "governorate" });
  const method = useWatch({ control, name: "paymentMethod" });

  if (!mounted) return <div className="h-64 animate-pulse rounded-lg bg-border" aria-busy="true" />;

  if (!lines.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="mb-4">{tCart("empty")}</p>
        <Link href="/products" className={buttonVariants({ variant: "primary", size: "md" })}>
          {tCart("startShopping")}
        </Link>
      </div>
    );
  }

  const info = new Map((data ?? []).map((v) => [v.id, v]));
  const subtotal = lines.reduce(
    (n, l) => n + (info.get(l.variantId)?.priceCents ?? 0) * l.quantity,
    0,
  );
  const zone = zones.find((z) => z.governorates.includes(governorate));
  const totals = zone ? computeTotals(subtotal, zone.feeCents) : null;

  async function submit(values: FormValues) {
    setServerError(undefined);
    const { paymentMethod, ...address } = values;
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, paymentMethod, items: lines, locale }),
    });
    const body = await res.json();
    if (!res.ok) {
      setServerError(text.api((body as ApiErrorBody).error));
      return;
    }
    window.location.assign(body.url); // card: the payment page; cash on delivery: the confirmation
  }

  const summary = (
    <>
      <ul className="space-y-1 text-sm">
        {lines.map((l) => {
          const v = info.get(l.variantId);
          return (
            <li key={l.variantId} className="flex justify-between gap-2">
              <span>
                {v ? `${pick(v.productName, locale)} — ${pick(v.variantName, locale)}` : "..."} ×
                {l.quantity}
              </span>
              <span>{v && <Price cents={v.priceCents * l.quantity} />}</span>
            </li>
          );
        })}
      </ul>
      <dl className="space-y-1 border-t border-border pt-2 text-sm">
        <div className="flex justify-between">
          <dt>{tCart("subtotal")}</dt>
          <dd>
            <Price cents={subtotal} />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>{tCart("shipping")}</dt>
          <dd>
            {!totals ? (
              <span className="text-muted">{t("chooseGovernorate")}</span>
            ) : totals.shippingCents === 0 ? (
              tCart("free")
            ) : (
              <Price cents={totals.shippingCents} />
            )}
          </dd>
        </div>
        {totals && (
          <div className="flex justify-between text-muted">
            <dt>{t("vatIncluded")}</dt>
            <dd>
              <Price cents={totals.vatCents} />
            </dd>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold">
          <dt>{tCart("total")}</dt>
          <dd>
            <Price cents={totals ? totals.totalCents : subtotal} />
          </dd>
        </div>
      </dl>
    </>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      {/* phones: the summary folds away so the address form is the first thing in view */}
      <details className="rounded-lg border border-border bg-card lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 py-2 font-semibold">
          <span>{tCart("summary")}</span>
          <Price cents={totals ? totals.totalCents : subtotal} />
        </summary>
        <div className="space-y-3 border-t border-border p-4">{summary}</div>
      </details>

      <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-4 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">{t("shippingAddress")}</h2>

        {TEXT_FIELDS.slice(0, 2).map((f) => (
          <Field
            key={f.name}
            name={f.name}
            label={t(`fields.${f.name}`)}
            error={text.field(errors[f.name]?.message)}
          >
            <input
              id={f.name}
              type={"type" in f ? f.type : "text"}
              inputMode={f.name === "phone" ? "numeric" : undefined}
              autoComplete={f.name === "phone" ? "tel" : "name"}
              aria-invalid={!!errors[f.name]}
              aria-describedby={errors[f.name] ? `${f.name}-err` : undefined}
              className={input}
              {...register(f.name)}
            />
          </Field>
        ))}

        <Field
          name="governorate"
          label={t("fields.governorate")}
          error={text.field(errors.governorate?.message)}
        >
          <select
            id="governorate"
            aria-invalid={!!errors.governorate}
            aria-describedby={errors.governorate ? "governorate-err" : undefined}
            className={input}
            {...register("governorate")}
          >
            <option value="">{t("selectGovernorate")}</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>
                {tGov(g)}
              </option>
            ))}
          </select>
        </Field>

        {TEXT_FIELDS.slice(2).map((f) => (
          <div key={f.name} className={f.wide ? "sm:col-span-2" : ""}>
            <Field
              name={f.name}
              label={t(`fields.${f.name}`)}
              error={text.field(errors[f.name]?.message)}
            >
              <input
                id={f.name}
                aria-invalid={!!errors[f.name]}
                aria-describedby={errors[f.name] ? `${f.name}-err` : undefined}
                className={input}
                {...register(f.name)}
              />
            </Field>
          </div>
        ))}

        {zone && (
          <p
            className="rounded-md border border-border bg-card px-3 py-2 text-sm sm:col-span-2"
            role="status"
          >
            {t.rich("shippingEstimate", {
              zone: zone.name,
              days: zone.etaDays,
              fee: () =>
                totals?.shippingCents === 0 ? tCart("free") : <Price cents={zone.feeCents} />,
            })}
          </p>
        )}

        <fieldset className="space-y-2 sm:col-span-2">
          <legend className="mb-1 text-lg font-semibold">{t("payment")}</legend>
          {(["CARD", "COD"] as const).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                method === m ? "border-accent bg-accent/5" : "border-border bg-card"
              }`}
            >
              <input type="radio" value={m} className="mt-1" {...register("paymentMethod")} />
              <span>
                <span className="block font-medium">{tMethod(m)}</span>
                <span className="block text-sm text-muted">{t(`methodHint.${m}`)}</span>
              </span>
            </label>
          ))}
          {errors.paymentMethod && (
            <p role="alert" className="text-sm text-danger">
              {text.field(errors.paymentMethod.message)}
            </p>
          )}
        </fieldset>

        {serverError && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            {serverError}{" "}
            <Link href="/cart" className="underline">
              {t("reviewCart")}
            </Link>
          </p>
        )}
        {/* phones: the order button is pinned to the bottom edge */}
        <div className="max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:border-t max-lg:border-border max-lg:bg-card max-lg:px-4 max-lg:py-3 sm:col-span-2">
          <button
            disabled={isSubmitting}
            onMouseDown={(e) => e.preventDefault()} // keep the click from being lost to a layout shift
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full lg:w-auto")}
          >
            {isSubmitting
              ? t("placing")
              : method === "COD"
                ? t("placeOrder")
                : t("continueToPayment")}
          </button>
        </div>
      </form>

      <aside className="hidden h-fit space-y-3 rounded-lg border border-border bg-card p-4 lg:block">
        <h2 className="font-semibold">{tCart("summary")}</h2>
        {summary}
      </aside>
    </div>
  );
}
