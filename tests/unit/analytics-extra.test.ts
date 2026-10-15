import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  getAbandonedCarts,
  getFunnel,
  getPaymentSplit,
  getSalesByGovernorate,
} from "@/lib/services/analytics";
import { makeProduct, makeUser, rawOrder, resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

const DAY = 86_400_000;
const range = () => ({ from: new Date(Date.now() - 7 * DAY), to: new Date(Date.now() + DAY) });

describe("funnel", () => {
  it("counts each visit once per step, in order", async () => {
    const at = new Date();
    await db.analyticsEvent.createMany({
      data: [
        // visit A: looked at two products, added one, went to checkout, bought
        { type: "PRODUCT_VIEW", sessionId: "a", createdAt: at },
        { type: "PRODUCT_VIEW", sessionId: "a", createdAt: at },
        { type: "ADD_TO_CART", sessionId: "a", createdAt: at },
        { type: "CHECKOUT_START", sessionId: "a", createdAt: at },
        { type: "ORDER_PLACED", sessionId: "a", createdAt: at },
        // visit B: looked and added to the cart, then left
        { type: "PRODUCT_VIEW", sessionId: "b", createdAt: at },
        { type: "ADD_TO_CART", sessionId: "b", createdAt: at },
        // visit C: only looked
        { type: "PRODUCT_VIEW", sessionId: "c", createdAt: at },
        // outside the period
        { type: "PRODUCT_VIEW", sessionId: "d", createdAt: new Date(Date.now() - 30 * DAY) },
      ],
    });
    expect(await getFunnel(range())).toEqual([
      { stage: "PRODUCT_VIEW", sessions: 3 },
      { stage: "ADD_TO_CART", sessions: 2 },
      { stage: "CHECKOUT_START", sessions: 1 },
      { stage: "ORDER_PLACED", sessions: 1 },
    ]);
  });

  it("is all zeros when nobody visited", async () => {
    expect((await getFunnel(range())).every((s) => s.sessions === 0)).toBe(true);
  });
});

describe("abandoned carts", () => {
  it("counts carts with items left alone past the idle time, with what they hold", async () => {
    const product = await makeProduct({
      slug: "beans",
      variants: [{ sku: "B-1", priceCents: 20_000, stock: 9 }],
    });
    const variantId = product.variants[0].id;
    const stale = await makeUser("stale@example.com");
    const fresh = await makeUser("fresh@example.com");
    const empty = await makeUser("empty@example.com");

    await db.cart.create({
      data: { userId: stale.id, items: { create: [{ variantId, quantity: 2 }] } },
    });
    await db.cart.create({
      data: { userId: fresh.id, items: { create: [{ variantId, quantity: 1 }] } },
    });
    await db.cart.create({ data: { userId: empty.id } });
    // age only the first cart
    await db.$executeRaw`UPDATE "Cart" SET "updatedAt" = now() - interval '3 hours' WHERE "userId" = ${stale.id}`;

    expect(await getAbandonedCarts(range(), 60)).toEqual({ carts: 1, valueCents: 40_000 });
  });
});

describe("sales splits", () => {
  it("groups counted orders by governorate and by payment method, ignoring refunds and pending ones", async () => {
    const u = await makeUser("buyer@example.com");
    await rawOrder(u.id, {
      cents: 10_000,
      shippingAddress: { governorate: "C" },
      paymentMethod: "CARD",
    });
    await rawOrder(u.id, {
      cents: 30_000,
      shippingAddress: { governorate: "C" },
      paymentMethod: "COD",
      paymentStatus: "UNPAID",
    });
    await rawOrder(u.id, {
      cents: 5_000,
      shippingAddress: { governorate: "ALX" },
      paymentMethod: "CARD",
    });
    await rawOrder(u.id, {
      cents: 99_000,
      shippingAddress: { governorate: "C" },
      paymentStatus: "REFUNDED",
    });
    await rawOrder(u.id, {
      cents: 99_000,
      shippingAddress: { governorate: "C" },
      status: "PENDING",
      paymentStatus: "UNPAID",
      confirmedAt: null,
    });

    expect(await getSalesByGovernorate(range())).toEqual([
      { governorate: "C", orders: 2, salesCents: 40_000 },
      { governorate: "ALX", orders: 1, salesCents: 5_000 },
    ]);
    expect(await getPaymentSplit(range())).toEqual([
      { method: "COD", orders: 1, salesCents: 30_000 },
      { method: "CARD", orders: 2, salesCents: 15_000 },
    ]);
  });
});
