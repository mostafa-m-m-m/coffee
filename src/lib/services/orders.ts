import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Locale, PaymentMethod, Prisma } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api-error";
import { PAYMENT_SESSION_MINUTES } from "@/lib/config";
import { computeTotals } from "@/lib/pricing";
import { asLocalized } from "@/lib/i18n/localized";
import type { AddressInput } from "@/lib/validations/address";

type Tx = Prisma.TransactionClient;

export type CartLineInput = { variantId: string; quantity: number };

export type OrderEventInput = {
  type: string;
  fromStatus?: string;
  toStatus?: string;
  actorId?: string | null;
  note?: string;
};

export const recordEvent = (tx: Tx, orderId: string, e: OrderEventInput) =>
  tx.orderEvent.create({
    data: {
      orderId,
      type: e.type,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorId: e.actorId ?? null,
      note: e.note,
    },
  });

class InsufficientStockError extends Error {}

/**
 * Takes the stock for an order: each line is `UPDATE ... WHERE stock >= qty`, atomic in the
 * database, so two buyers of the last unit can never both succeed. Throws (and the surrounding
 * transaction rolls back) if any line is short.
 */
async function deductStock(tx: Tx, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    const res = await tx.productVariant.updateMany({
      where: { id: item.variantId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (res.count === 0) throw new InsufficientStockError();
  }
  await tx.inventoryLog.createMany({
    data: items.map((i) => ({
      variantId: i.variantId,
      change: -i.quantity,
      reason: "SALE" as const,
      orderId,
    })),
  });
}

/** Puts an order's stock back (cancelled before shipping). */
export async function restoreStock(tx: Tx, orderId: string, actorId?: string | null) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }
  await tx.inventoryLog.createMany({
    data: items.map((i) => ({
      variantId: i.variantId,
      change: i.quantity,
      reason: "CANCELLATION" as const,
      orderId,
      actorId: actorId ?? null,
    })),
  });
}

export type CreateOrderInput = {
  userId: string;
  lines: CartLineInput[];
  address: AddressInput;
  paymentMethod: PaymentMethod;
  locale: Locale;
};

/**
 * Creates an order from cart lines. Prices, names, shipping and VAT are computed here from the
 * database, never taken from the browser, and copied onto the order so later catalog edits never
 * change history.
 *  - COD  -> CONFIRMED/UNPAID right away, stock deducted in the same transaction.
 *  - CARD -> PENDING/UNPAID with a payment session; stock is only checked now and deducted when
 *            the payment is confirmed (see `confirmPayment`).
 */
export async function createOrder(input: CreateOrderInput) {
  const { userId, lines, address, paymentMethod, locale } = input;
  if (!lines.length) throw new ApiError(400, "EMPTY_CART");

  // merge duplicate variant ids
  const wanted = new Map<string, number>();
  for (const l of lines) wanted.set(l.variantId, (wanted.get(l.variantId) ?? 0) + l.quantity);

  const [variants, zone] = await Promise.all([
    db.productVariant.findMany({
      where: { id: { in: [...wanted.keys()] } },
      include: { product: { select: { name: true, isActive: true } } },
    }),
    db.shippingZone.findFirst({ where: { governorates: { has: address.governorate } } }),
  ]);
  if (!zone)
    throw new ApiError(400, "VALIDATION", {
      fields: { governorate: "validation.governorateInvalid" },
    });

  const problems: string[] = [];
  for (const [id, qty] of wanted) {
    const v = variants.find((x) => x.id === id);
    if (!v || v.isArchived || !v.product.isActive) throw new ApiError(409, "ITEM_UNAVAILABLE");
    if (v.stock < qty) {
      const name = asLocalized(v.product.name).en || asLocalized(v.product.name).ar;
      problems.push(`${name} (${asLocalized(v.name).en}) × ${v.stock}`);
    }
  }
  if (problems.length) {
    throw new ApiError(409, "INSUFFICIENT_STOCK", { params: { items: problems.join(" · ") } });
  }

  const items = variants.map((v) => ({
    variantId: v.id,
    productName: v.product.name as Prisma.InputJsonValue,
    variantName: v.name as Prisma.InputJsonValue,
    unitPriceCents: v.priceCents,
    quantity: wanted.get(v.id)!,
  }));
  const subtotal = items.reduce((n, i) => n + i.unitPriceCents * i.quantity, 0);
  const totals = computeTotals(subtotal, zone.feeCents);
  const isCod = paymentMethod === "COD";
  const now = new Date();

  try {
    return await db.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId,
          ...totals,
          paymentMethod,
          locale,
          status: isCod ? "CONFIRMED" : "PENDING",
          confirmedAt: isCod ? now : null,
          paymentRef: isCod ? null : randomBytes(16).toString("hex"),
          paymentExpiresAt: isCod
            ? null
            : new Date(now.getTime() + PAYMENT_SESSION_MINUTES * 60_000),
          shippingAddress: {
            ...address,
            zone: { id: zone.id, name: zone.name, etaDays: zone.etaDays, feeCents: zone.feeCents },
          },
          items: { create: items },
        },
        include: { items: true },
      });
      await recordEvent(tx, order.id, {
        type: "created",
        toStatus: order.status,
        actorId: userId,
        note: paymentMethod,
      });
      if (isCod) await deductStock(tx, order.id);
      // the saved cart became this order; leaving it would bring the same lines back on the next sync
      await tx.cartItem.deleteMany({ where: { cart: { userId } } });
      return order;
    });
  } catch (e) {
    if (e instanceof InsufficientStockError)
      throw new ApiError(409, "INSUFFICIENT_STOCK", { params: { items: "" } });
    throw e;
  }
}

export type PaymentResult =
  | { outcome: "paid" }
  | { outcome: "already_processed" }
  | { outcome: "out_of_stock" }
  | { outcome: "expired" }
  | { outcome: "not_found" };

/**
 * Card payment succeeded. Safe to call any number of times, concurrently:
 *  1. The claim is a conditional update on (PENDING, not yet PAID), so only one caller wins.
 *  2. Stock is deducted with the atomic conditional update, inside the same transaction.
 *  3. If any line is short the transaction rolls back, the order is cancelled and marked
 *     REFUNDED (the money goes back), and the caller sends the apology email.
 */
export async function confirmPayment(
  paymentRef: string,
): Promise<PaymentResult & { orderId?: string }> {
  const order = await db.order.findUnique({
    where: { paymentRef },
    select: { id: true, status: true, paymentStatus: true, paymentExpiresAt: true },
  });
  if (!order) return { outcome: "not_found" };
  if (order.status !== "PENDING" || order.paymentStatus === "PAID") {
    return { outcome: "already_processed", orderId: order.id };
  }
  if (order.paymentExpiresAt && order.paymentExpiresAt < new Date()) {
    await expireOrder(order.id);
    return { outcome: "expired", orderId: order.id };
  }

  try {
    return await db.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING", paymentStatus: { in: ["UNPAID", "FAILED"] } },
        data: { status: "CONFIRMED", paymentStatus: "PAID", confirmedAt: new Date() },
      });
      if (claimed.count === 0) return { outcome: "already_processed", orderId: order.id } as const;
      await deductStock(tx, order.id);
      await recordEvent(tx, order.id, {
        type: "payment_succeeded",
        fromStatus: "PENDING",
        toStatus: "CONFIRMED",
      });
      return { outcome: "paid", orderId: order.id } as const;
    });
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      await db.$transaction(async (tx) => {
        const res = await tx.order.updateMany({
          where: { id: order.id, status: "PENDING" },
          data: { status: "CANCELLED", paymentStatus: "REFUNDED" },
        });
        if (res.count) {
          await recordEvent(tx, order.id, {
            type: "refunded",
            fromStatus: "PENDING",
            toStatus: "CANCELLED",
            note: "out_of_stock",
          });
        }
      });
      return { outcome: "out_of_stock", orderId: order.id };
    }
    throw e;
  }
}

/** The card was declined: stay PENDING so the customer can try again until the session ends. */
export async function failPayment(paymentRef: string, reason: string) {
  const res = await db.order.updateMany({
    where: { paymentRef, status: "PENDING", paymentStatus: { in: ["UNPAID", "FAILED"] } },
    data: { paymentStatus: "FAILED" },
  });
  if (res.count) {
    const order = await db.order.findUnique({ where: { paymentRef }, select: { id: true } });
    if (order)
      await db.$transaction((tx) =>
        recordEvent(tx, order.id, { type: "payment_failed", note: reason }),
      );
  }
  return res.count === 1;
}

/** Session ended without payment: cancel, never touching stock (it was never taken). */
export async function expireOrder(orderId: string) {
  return db.$transaction(async (tx) => {
    const res = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING", paymentStatus: { in: ["UNPAID", "FAILED"] } },
      data: { status: "CANCELLED" },
    });
    if (res.count) {
      await recordEvent(tx, orderId, {
        type: "expired",
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
      });
    }
    return res.count === 1;
  });
}

/** Called whenever someone opens an order or its payment page: cancels it first if its time is up. */
export async function expireIfDue(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { status: true, paymentExpiresAt: true },
  });
  if (
    order?.status === "PENDING" &&
    order.paymentExpiresAt &&
    order.paymentExpiresAt < new Date()
  ) {
    return expireOrder(orderId);
  }
  return false;
}

/** The daily sweep for sessions nobody reopened. */
export async function expireDueOrders(now = new Date()) {
  const due = await db.order.findMany({
    where: { status: "PENDING", paymentExpiresAt: { lt: now } },
    select: { id: true },
  });
  let cancelled = 0;
  for (const o of due) if (await expireOrder(o.id)) cancelled++;
  return cancelled;
}
