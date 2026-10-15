"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Price } from "@/components/price";
import { useCart } from "@/hooks/use-cart";
import { useMounted } from "@/hooks/use-mounted";
import { Link } from "@/i18n/navigation";
import { pick, type LocalizedText } from "@/lib/i18n/localized";
import { qualifiesForFreeShipping, remainingForFreeShipping } from "@/lib/pricing";

type VariantInfo = {
  id: string;
  variantName: LocalizedText;
  priceCents: number;
  stock: number;
  productName: LocalizedText;
  slug: string;
  image: string | null;
  isActive: boolean;
};

export function CartView() {
  const t = useTranslations("Store.cart");
  const locale = useLocale() as "ar" | "en";
  const lines = useCart((s) => s.lines);
  const { setQuantity, remove } = useCart();
  const mounted = useMounted();

  const ids = lines.map((l) => l.variantId).sort();
  const { data, isLoading, isError, refetch } = useQuery<VariantInfo[]>({
    queryKey: ["variants", ids],
    enabled: mounted && ids.length > 0,
    queryFn: async () => {
      const res = await fetch(`/api/variants?ids=${ids.join(",")}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  if (!mounted) return <CartSkeleton />;

  if (!lines.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="mb-4">{t("empty")}</p>
        <Link href="/products" className={buttonVariants({ variant: "primary", size: "md" })}>
          {t("startShopping")}
        </Link>
      </div>
    );
  }

  if (isLoading) return <CartSkeleton />;
  if (isError || !data) {
    return (
      <div role="alert" className="rounded-lg border border-border p-6">
        <p className="mb-3">{t("loadError")}</p>
        <button
          onClick={() => refetch()}
          className={buttonVariants({ variant: "primary", size: "md" })}
        >
          {t("retry")}
        </button>
      </div>
    );
  }

  const info = new Map(data.map((v) => [v.id, v]));
  const rows = lines.map((l) => ({ line: l, v: info.get(l.variantId) }));
  const valid = rows.filter((r) => r.v && r.v.isActive);
  const problems = valid.some((r) => r.line.quantity > r.v!.stock) || valid.length !== rows.length;
  const subtotal = valid.reduce((n, r) => n + r.v!.priceCents * r.line.quantity, 0);
  const free = qualifiesForFreeShipping(subtotal);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map(({ line, v }) => {
          if (!v || !v.isActive) {
            return (
              <li key={line.variantId} className="flex items-center justify-between p-4">
                <span className="text-muted">{t("unavailable")}</span>
                <button onClick={() => remove(line.variantId)} className="text-danger underline">
                  {t("remove")}
                </button>
              </li>
            );
          }
          const over = line.quantity > v.stock;
          return (
            <li key={line.variantId} className="flex gap-4 p-4">
              <div className="relative size-20 shrink-0 overflow-hidden rounded bg-border">
                {v.image && (
                  <Image
                    src={v.image}
                    alt=""
                    fill
                    unoptimized
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Link href={`/products/${v.slug}`} className="font-medium hover:underline">
                  {pick(v.productName, locale)}
                </Link>
                <p className="text-sm text-muted">{pick(v.variantName, locale)}</p>
                <p className="text-sm">
                  <Price cents={v.priceCents} />
                </p>
                {over && (
                  <p role="alert" className="text-sm text-danger">
                    {v.stock === 0 ? t("soldOut") : t("onlyAvailable", { count: v.stock })}
                  </p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <label className="sr-only" htmlFor={`q-${v.id}`}>
                    {t("quantity")}
                  </label>
                  <button
                    aria-label={t("decrease")}
                    onClick={() => setQuantity(v.id, line.quantity - 1)}
                    className="size-8 rounded border border-border"
                  >
                    −
                  </button>
                  <span id={`q-${v.id}`} aria-live="polite" className="w-6 text-center">
                    {line.quantity}
                  </span>
                  <button
                    aria-label={t("increase")}
                    disabled={line.quantity >= v.stock}
                    onClick={() => setQuantity(v.id, line.quantity + 1)}
                    className="size-8 rounded border border-border disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    onClick={() => remove(v.id)}
                    className="ms-auto text-sm text-danger underline"
                  >
                    {t("remove")}
                  </button>
                </div>
              </div>
              <p className="font-medium">
                <Price cents={v.priceCents * line.quantity} />
              </p>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="font-semibold">{t("summary")}</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex items-baseline justify-between">
            <dt>{t("subtotal")}</dt>
            <dd>
              <Price cents={subtotal} />
            </dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt>{t("shipping")}</dt>
            <dd>{free ? t("free") : t("shippingAtCheckout")}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>{free ? t("total") : t("totalExShipping")}</dt>
            <dd>
              <Price cents={subtotal} />
            </dd>
          </div>
        </dl>
        {!free && (
          <p className="text-sm text-muted">
            {t.rich("freeShippingHint", {
              amount: () => <Price cents={remainingForFreeShipping(subtotal)} />,
            })}
          </p>
        )}
        {problems && (
          <p role="alert" className="text-sm text-danger">
            {t("fixProblems")}
          </p>
        )}
        {problems ? (
          <button
            disabled
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full")}
          >
            {t("checkout")}
          </button>
        ) : (
          <Link
            href="/checkout"
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "w-full")}
          >
            {t("checkout")}
          </Link>
        )}
      </aside>

      {/* phones: the total and the primary action stay within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-3 lg:hidden">
        <div className="leading-tight">
          <p className="text-xs text-muted">{t("total")}</p>
          <p className="text-lg font-semibold">
            <Price cents={subtotal} />
          </p>
        </div>
        {problems ? (
          <button
            disabled
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "flex-1")}
          >
            {t("checkout")}
          </button>
        ) : (
          <Link
            href="/checkout"
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "flex-1")}
          >
            {t("checkout")}
          </Link>
        )}
      </div>
    </div>
  );
}

function CartSkeleton() {
  return <div className="h-48 animate-pulse rounded-lg bg-border" aria-busy="true" />;
}
