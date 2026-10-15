import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Price } from "@/components/price";
import { Link, redirect } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { pick } from "@/lib/i18n/localized";
import { hasInvoice } from "@/lib/invoice-rules";
import { getFormatter } from "next-intl/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { expireIfDue } from "@/lib/services/orders";
import { ClearCart } from "./client";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout/success">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.success" });
  return { title: t("pageTitle") };
}

async function Success({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/checkout/success">["searchParams"];
}) {
  const { order: orderId } = await searchParams;
  const session = await getSession();
  const locale = await currentLocale();
  const t = await getTranslations("Store.success");
  const tStatus = await getTranslations("Common.status");
  const tPay = await getTranslations("Common.paymentStatus");
  const tMethod = await getTranslations("Common.paymentMethod");
  const tCart = await getTranslations("Store.cart");
  const tInvoice = await getTranslations("Common.invoice");
  const f = await getFormatter();
  if (!session?.user) return redirect({ href: "/login", locale });
  if (typeof orderId !== "string") return redirect({ href: "/account", locale });

  await expireIfDue(orderId); // an unpaid card order past its time is cancelled when someone looks
  const order = await db.order.findFirst({
    where: { id: orderId, userId: session.user.id }, // someone else's order is simply "not found"
    include: { items: true },
  });
  if (!order) return redirect({ href: "/account", locale });

  const cancelled = order.status === "CANCELLED";
  const awaiting = order.status === "PENDING";
  // the delivery time of the zone the order was priced with, counted from the day it was placed
  const etaDays = (order.shippingAddress as { zone?: { etaDays?: number } } | null)?.zone?.etaDays;
  const eta =
    etaDays && !cancelled
      ? new Date((order.confirmedAt ?? order.createdAt).getTime() + etaDays * 86_400_000)
      : null;

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-border bg-card p-6">
      {!cancelled && !awaiting && <ClearCart />}
      {!cancelled && !awaiting && (
        <div
          aria-hidden
          className="mx-auto grid size-14 place-items-center rounded-full bg-success text-2xl text-success-fg"
        >
          ✓
        </div>
      )}

      <h1 className="text-center text-2xl font-bold">
        {cancelled ? t("failedTitle") : awaiting ? t("pendingTitle") : t("confirmedTitle")}
      </h1>
      {cancelled && (
        <p role="alert">
          {order.paymentStatus === "REFUNDED" ? t("failedHint") : t("expiredHint")}
        </p>
      )}
      {awaiting && order.paymentRef && (
        <Link
          href={`/pay/${order.paymentRef}`}
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "inline-block")}
        >
          {t("payNow")}
        </Link>
      )}
      <p>
        {t.rich("orderLine", {
          number: String(order.orderNumber),
          status: tStatus(order.status),
          strong: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
      <p className="text-sm text-muted">
        {tMethod(order.paymentMethod)} — {tPay(order.paymentStatus)}
      </p>
      {eta && (
        <p className="text-sm">{t("estimatedDelivery", { date: f.dateTime(eta, "date") })}</p>
      )}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card text-sm">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 p-3">
            <span>
              {pick(i.productName, locale)} — {pick(i.variantName, locale)} ×{i.quantity}
            </span>
            <Price cents={i.unitPriceCents * i.quantity} />
          </li>
        ))}
        <li className="flex justify-between p-3">
          <span>{tCart("shipping")}</span>
          <span>{order.shippingCents ? <Price cents={order.shippingCents} /> : tCart("free")}</span>
        </li>
        <li className="flex justify-between p-3 text-muted">
          <span>{t("vatIncluded")}</span>
          <Price cents={order.vatCents} />
        </li>
        <li className="flex justify-between p-3 font-semibold">
          <span>{tCart("total")}</span>
          <Price cents={order.totalCents} />
        </li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Link href="/account" className={buttonVariants({ variant: "primary", size: "md" })}>
          {t("myOrders")}
        </Link>
        {hasInvoice(order) && (
          <a
            href={`/api/orders/${order.id}/invoice`}
            target="_blank"
            rel="noopener"
            className={buttonVariants({ variant: "secondary", size: "md" })}
          >
            {tInvoice("download")}
          </a>
        )}
        <Link href="/products" className={buttonVariants({ variant: "secondary", size: "md" })}>
          {t("continueShopping")}
        </Link>
      </div>
    </div>
  );
}

export default async function SuccessPage(props: PageProps<"/[locale]/checkout/success">) {
  await pinLocale(props.params);
  return (
    <main>
      <Suspense
        fallback={<div className="h-48 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <Success searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
