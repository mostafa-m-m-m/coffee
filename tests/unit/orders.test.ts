import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  confirmPayment,
  createOrder,
  expireDueOrders,
  expireIfDue,
  failPayment,
} from "@/lib/services/orders";
import { address, L, makeProduct, makeUser, makeZone, resetDb, stockOf } from "./fixtures";

let userId: string;
let variantA: string; // 200 EGP, stock 10
let variantB: string; // 50 EGP, stock 1

beforeEach(async () => {
  await resetDb();
  await makeZone();
  userId = (await makeUser("buyer@test.dev", "Buyer")).id;
  const product = await makeProduct({
    slug: "test-beans",
    name: L("Test Beans", "بن تجريبي"),
    variants: [
      { sku: "A", priceCents: 20000, stock: 10, name: L("250g", "250 جم") },
      { sku: "B", priceCents: 5000, stock: 1, name: L("1kg", "1 كجم") },
    ],
  });
  variantA = product.variants.find((v) => v.sku === "A")!.id;
  variantB = product.variants.find((v) => v.sku === "B")!.id;
});

afterAll(() => db.$disconnect());

const place = (lines: { variantId: string; quantity: number }[], method: "CARD" | "COD" = "CARD") =>
  createOrder({ userId, lines, address, paymentMethod: method, locale: "ar" });

describe("createOrder: totals and snapshots", () => {
  it("snapshots both languages, computes shipping and the VAT included in the total", async () => {
    const order = await place([{ variantId: variantA, quantity: 2 }]);

    expect(order.subtotalCents).toBe(40000);
    expect(order.shippingCents).toBe(5000); // zone fee, under the free-shipping threshold
    expect(order.totalCents).toBe(45000);
    expect(order.vatCents).toBe(5526); // 45,000 x 14/114, rounded
    expect(order.locale).toBe("ar");
    expect(order.items[0]).toMatchObject({
      productName: { en: "Test Beans", ar: "بن تجريبي" },
      variantName: { en: "250g", ar: "250 جم" },
      unitPriceCents: 20000,
    });
    expect((order.shippingAddress as { zone: { etaDays: number } }).zone.etaDays).toBe(2);
  });

  it("ships free from 1,000 EGP", async () => {
    const order = await place([{ variantId: variantA, quantity: 5 }]); // exactly 1,000 EGP
    expect(order.shippingCents).toBe(0);
    expect(order.totalCents).toBe(100000);
  });

  it("never takes a price from the caller: it is read from the database", async () => {
    await db.productVariant.update({ where: { id: variantA }, data: { priceCents: 30000 } });
    const order = await place([{ variantId: variantA, quantity: 1 }]);
    expect(order.items[0].unitPriceCents).toBe(30000);
  });

  it("merges duplicate lines and rejects empty carts, hidden products and quantities above stock", async () => {
    const merged = await place([
      { variantId: variantA, quantity: 1 },
      { variantId: variantA, quantity: 2 },
    ]);
    expect(merged.items).toHaveLength(1);
    expect(merged.items[0].quantity).toBe(3);

    await expect(place([])).rejects.toMatchObject({ code: "EMPTY_CART" });
    await expect(place([{ variantId: variantB, quantity: 2 }])).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
    await db.productVariant.update({ where: { id: variantA }, data: { isArchived: true } });
    await expect(place([{ variantId: variantA, quantity: 1 }])).rejects.toMatchObject({
      code: "ITEM_UNAVAILABLE",
    });
    await db.productVariant.update({ where: { id: variantA }, data: { isArchived: false } });
    await db.product.updateMany({ data: { isActive: false } });
    await expect(place([{ variantId: variantA, quantity: 1 }])).rejects.toMatchObject({
      code: "ITEM_UNAVAILABLE",
    });
  });

  it("refuses a governorate that no shipping zone covers", async () => {
    await expect(
      createOrder({
        userId,
        lines: [{ variantId: variantA, quantity: 1 }],
        address: { ...address, governorate: "ALX" },
        paymentMethod: "COD",
        locale: "en",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("createOrder: card vs cash on delivery", () => {
  it("card: PENDING with a 30-minute payment session, stock untouched", async () => {
    const order = await place([{ variantId: variantA, quantity: 2 }]);
    expect(order).toMatchObject({
      status: "PENDING",
      paymentStatus: "UNPAID",
      paymentMethod: "CARD",
      confirmedAt: null,
    });
    expect(order.paymentRef).toMatch(/^[0-9a-f]{32}$/);
    const minutes = (order.paymentExpiresAt!.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(29);
    expect(minutes).toBeLessThanOrEqual(30);
    expect(await stockOf(variantA)).toBe(10);
  });

  it("cash on delivery: CONFIRMED/UNPAID at once, stock taken and logged, history started", async () => {
    const order = await place([{ variantId: variantA, quantity: 3 }], "COD");
    expect(order).toMatchObject({ status: "CONFIRMED", paymentStatus: "UNPAID", paymentRef: null });
    expect(order.confirmedAt).toBeInstanceOf(Date);
    expect(await stockOf(variantA)).toBe(7);
    expect(await db.inventoryLog.findFirstOrThrow({ where: { orderId: order.id } })).toMatchObject({
      change: -3,
      reason: "SALE",
    });
    expect(await db.orderEvent.count({ where: { orderId: order.id, type: "created" } })).toBe(1);
  });

  it("two cash-on-delivery buyers of the last unit: exactly one wins and stock never goes negative", async () => {
    const results = await Promise.allSettled([
      place([{ variantId: variantB, quantity: 1 }], "COD"),
      place([{ variantId: variantB, quantity: 1 }], "COD"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await stockOf(variantB)).toBe(0);
    expect(await db.order.count()).toBe(1); // the loser's order was rolled back
  });
});

describe("confirmPayment (card)", () => {
  it("confirms, takes stock and records history", async () => {
    const order = await place([{ variantId: variantA, quantity: 4 }]);
    expect(await confirmPayment(order.paymentRef!)).toMatchObject({ outcome: "paid" });

    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect(after.confirmedAt).toBeInstanceOf(Date);
    expect(await stockOf(variantA)).toBe(6);
    expect(
      await db.orderEvent.count({ where: { orderId: order.id, type: "payment_succeeded" } }),
    ).toBe(1);
  });

  it("is idempotent: a repeated or concurrent confirmation deducts stock once", async () => {
    const order = await place([{ variantId: variantA, quantity: 4 }]);
    const results = await Promise.all([
      confirmPayment(order.paymentRef!),
      confirmPayment(order.paymentRef!),
      confirmPayment(order.paymentRef!),
    ]);
    expect(results.filter((r) => r.outcome === "paid")).toHaveLength(1);
    expect(await stockOf(variantA)).toBe(6);
    expect(await confirmPayment(order.paymentRef!)).toMatchObject({ outcome: "already_processed" });
    expect(await confirmPayment("nope")).toMatchObject({ outcome: "not_found" });
  });

  it("stock sold out while the customer was paying: order cancelled and refunded, stock untouched", async () => {
    const order = await place([{ variantId: variantB, quantity: 1 }]);
    await place([{ variantId: variantB, quantity: 1 }], "COD"); // someone else takes the last unit
    expect(await confirmPayment(order.paymentRef!)).toMatchObject({ outcome: "out_of_stock" });

    const after = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(after).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });
    expect(await stockOf(variantB)).toBe(0);
    expect(await db.orderEvent.count({ where: { orderId: order.id, type: "refunded" } })).toBe(1);
  });

  it("a declined card keeps the order open for another try", async () => {
    const order = await place([{ variantId: variantA, quantity: 1 }]);
    await failPayment(order.paymentRef!, "card_declined");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe(
      "FAILED",
    );
    expect(await confirmPayment(order.paymentRef!)).toMatchObject({ outcome: "paid" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe(
      "PAID",
    );
  });

  it("refuses to confirm a session that has expired, and cancels the order", async () => {
    const order = await place([{ variantId: variantA, quantity: 1 }]);
    await db.order.update({
      where: { id: order.id },
      data: { paymentExpiresAt: new Date(Date.now() - 1000) },
    });
    expect(await confirmPayment(order.paymentRef!)).toMatchObject({ outcome: "expired" });
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "CANCELLED",
    );
    expect(await stockOf(variantA)).toBe(10); // never taken, never returned
  });
});

describe("expiry", () => {
  it("cancels due sessions the moment they are opened, without touching stock", async () => {
    const order = await place([{ variantId: variantA, quantity: 2 }]);
    expect(await expireIfDue(order.id)).toBe(false); // still inside its 30 minutes
    await db.order.update({
      where: { id: order.id },
      data: { paymentExpiresAt: new Date(Date.now() - 1000) },
    });
    expect(await expireIfDue(order.id)).toBe(true);
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe(
      "CANCELLED",
    );
    expect(await db.orderEvent.count({ where: { orderId: order.id, type: "expired" } })).toBe(1);
    expect(await stockOf(variantA)).toBe(10);
  });

  it("the daily sweep cancels what nobody reopened, and leaves live sessions alone", async () => {
    const stale = await place([{ variantId: variantA, quantity: 1 }]);
    const live = await place([{ variantId: variantA, quantity: 1 }]);
    await db.order.update({
      where: { id: stale.id },
      data: { paymentExpiresAt: new Date(Date.now() - 1000) },
    });
    expect(await expireDueOrders()).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: stale.id } })).status).toBe(
      "CANCELLED",
    );
    expect((await db.order.findUniqueOrThrow({ where: { id: live.id } })).status).toBe("PENDING");
  });
});
