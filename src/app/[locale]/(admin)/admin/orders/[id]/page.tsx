import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Price } from "@/components/price";
import { Link } from "@/i18n/navigation";
import { pinLocale } from "@/i18n/server";
import { PaymentBadge, StatusBadge } from "@/components/patterns/status-badge";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { isGovernorate } from "@/lib/geo";
import { pick } from "@/lib/i18n/localized";
import { expireIfDue } from "@/lib/services/orders";
import { ALLOWED_TRANSITIONS } from "@/lib/services/admin-orders";
import { hasInvoice } from "@/lib/invoice-rules";
import { RefundButton } from "./refund-button";
import { StatusControl } from "./status-control";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/orders/[id]">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.orderDetail" });
  return { title: t("title") };
}

// the happy path, in order; a cancelled order leaves it
const TIMELINE = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;

type Address = {
  fullName?: string;
  phone?: string;
  governorate?: string;
  area?: string;
  street?: string;
  building?: string;
  notes?: string;
  zone?: { etaDays?: number };
};

const EVENT_TYPES = [
  "created",
  "status_changed",
  "payment_succeeded",
  "payment_failed",
  "refunded",
  "expired",
] as const;
const EVENT_NOTES = ["CARD", "COD", "cod_collected", "out_of_stock"] as const;

async function OrderDetail({
  params,
}: {
  params: PageProps<"/[locale]/admin/orders/[id]">["params"];
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getTranslations("Admin.orderDetail");
  const tStatus = await getTranslations("Common.status");
  const tMethod = await getTranslations("Common.paymentMethod");
  const tGov = await getTranslations("Common.governorates");
  const tCart = await getTranslations("Store.cart");
  const tc = await getTranslations("Common");
  const f = await getFormatter();

  await expireIfDue(id); // an unpaid card order whose time is up is cancelled the moment someone looks
  const [session, order] = await Promise.all([
    getSession(),
    db.order.findUnique({
      where: { id },
      include: {
        items: true,
        user: { select: { name: true, email: true } },
        events: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);
  if (!order) notFound();
  const actors = new Map(
    (
      await db.user.findMany({
        where: {
          id: {
            in: [...new Set(order.events.map((e) => e.actorId).filter((x): x is string => !!x))],
          },
        },
        select: { id: true, name: true },
      })
    ).map((u) => [u.id, u.name]),
  );
  const address = (order.shippingAddress ?? {}) as Address;
  const canEdit = session?.user.role === "ADMIN";
  const canRefund = order.paymentStatus === "PAID" && order.status !== "CANCELLED";
  const step = TIMELINE.indexOf(order.status as (typeof TIMELINE)[number]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{t("heading", { number: order.orderNumber })}</h1>
        <StatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
        <span className="text-sm text-muted">{f.dateTime(order.createdAt, "date")}</span>
      </div>

      {step >= 0 && (
        <ol aria-label={t("timeline")} className="flex flex-wrap gap-2 text-sm">
          {TIMELINE.map((s, i) => (
            <li
              key={s}
              aria-current={i === step ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                i < step
                  ? "border-success text-success"
                  : i === step
                    ? "border-accent bg-accent text-accent-fg"
                    : "border-border text-muted"
              }`}
            >
              <span aria-hidden>{i < step ? "✓" : f.number(i + 1, "integer")}</span>
              {tStatus(s)}
            </li>
          ))}
        </ol>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section aria-labelledby="items" className="rounded-lg border border-border bg-card">
            <h2 id="items" className="border-b border-border p-4 font-semibold">
              {t("items")}
            </h2>
            <ul className="divide-y divide-border text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 p-4">
                  <span>
                    {pick(i.productName, locale as "ar" | "en")} —{" "}
                    {pick(i.variantName, locale as "ar" | "en")}
                    <span className="text-muted"> × {f.number(i.quantity, "integer")}</span>
                  </span>
                  <Price cents={i.unitPriceCents * i.quantity} />
                </li>
              ))}
              <li className="flex justify-between p-4">
                <span>{tCart("subtotal")}</span>
                <Price cents={order.subtotalCents} />
              </li>
              <li className="flex justify-between p-4">
                <span>{tCart("shipping")}</span>
                <span>
                  {order.shippingCents ? <Price cents={order.shippingCents} /> : tCart("free")}
                </span>
              </li>
              <li className="flex justify-between p-4 text-muted">
                <span>{t("vatIncluded")}</span>
                <Price cents={order.vatCents} />
              </li>
              <li className="flex justify-between p-4 font-semibold">
                <span>{tCart("total")}</span>
                <Price cents={order.totalCents} />
              </li>
            </ul>
          </section>

          <section
            aria-labelledby="history"
            className="rounded-lg border border-border bg-card p-4"
          >
            <h2 id="history" className="mb-3 font-semibold">
              {t("history")}
            </h2>
            <ol className="space-y-3 border-s border-border ps-4 text-sm">
              {order.events.map((e) => {
                const known = (EVENT_TYPES as readonly string[]).includes(e.type);
                const note =
                  e.note && (EVENT_NOTES as readonly string[]).includes(e.note) ? e.note : null;
                return (
                  <li key={e.id} className="relative">
                    <span
                      aria-hidden
                      className="absolute -start-[1.35rem] top-1.5 size-2 rounded-full bg-accent"
                    />
                    <p className="font-medium">
                      {known
                        ? t(`events.${e.type as (typeof EVENT_TYPES)[number]}`, {
                            from: e.fromStatus
                              ? tStatus(e.fromStatus as (typeof TIMELINE)[number])
                              : "",
                            to: e.toStatus ? tStatus(e.toStatus as (typeof TIMELINE)[number]) : "",
                          })
                        : e.type}
                      {note && (
                        <span className="text-muted">
                          {" "}
                          · {t(`eventNotes.${note as (typeof EVENT_NOTES)[number]}`)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted">
                      {e.actorId ? (actors.get(e.actorId) ?? "—") : t("system")} ·{" "}
                      {f.dateTime(e.createdAt, "date")} {f.dateTime(e.createdAt, "time")}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section aria-labelledby="status" className="rounded-lg border border-border bg-card p-4">
            <h2 id="status" className="mb-3 font-semibold">
              {t("status")}
            </h2>
            {canEdit ? (
              <div className="space-y-4">
                <StatusControl
                  orderId={order.id}
                  current={order.status}
                  options={ALLOWED_TRANSITIONS[order.status]}
                />
                {canRefund && <RefundButton orderId={order.id} />}
              </div>
            ) : (
              <p className="text-sm text-muted">{t("viewerNotice")}</p>
            )}
          </section>

          <section
            aria-labelledby="payment"
            className="rounded-lg border border-border bg-card p-4 text-sm"
          >
            <h2 id="payment" className="mb-2 font-semibold">
              {t("payment")}
            </h2>
            <p>{tMethod(order.paymentMethod)}</p>
            {hasInvoice(order) && (
              <a
                href={`/api/orders/${order.id}/invoice`}
                target="_blank"
                rel="noopener"
                className="mt-2 inline-block underline"
              >
                {tc("invoice.download")}
              </a>
            )}
            <p className="mt-1">
              <PaymentBadge status={order.paymentStatus} />
            </p>
            {order.paymentRef && (
              <p className="mt-2 break-all font-mono text-xs text-muted" dir="ltr">
                {order.paymentRef}
              </p>
            )}
          </section>

          <section
            aria-labelledby="customer"
            className="rounded-lg border border-border bg-card p-4 text-sm"
          >
            <h2 id="customer" className="mb-2 font-semibold">
              {t("customer")}
            </h2>
            <p>{order.user.name}</p>
            <p className="text-muted">{order.user.email}</p>
          </section>

          <section
            aria-labelledby="ship"
            className="rounded-lg border border-border bg-card p-4 text-sm"
          >
            <h2 id="ship" className="mb-2 font-semibold">
              {t("shippingAddress")}
            </h2>
            <p>{address.fullName}</p>
            <p>
              {[address.building, address.street, address.area]
                .filter(Boolean)
                .join(tc("listSeparator"))}
            </p>
            <p>
              {isGovernorate(address.governorate) ? tGov(address.governorate) : address.governorate}
            </p>
            {address.notes && <p className="text-muted">{address.notes}</p>}
            <p className="text-muted" dir="ltr">
              {address.phone}
            </p>
          </section>
        </div>
      </div>

      <Link href="/admin/orders" className="inline-block underline">
        {t("back")}
      </Link>
    </div>
  );
}

export default async function OrderPage(props: PageProps<"/[locale]/admin/orders/[id]">) {
  await pinLocale(props.params);
  return (
    <main>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <OrderDetail params={props.params} />
      </Suspense>
    </main>
  );
}
