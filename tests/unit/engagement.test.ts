import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { notifyBackInStock } from "@/lib/services/back-in-stock";
import { subscribe } from "@/lib/services/subscribers";
import { trackEvent } from "@/lib/services/tracking";
import { subscribeSchema } from "@/lib/validations/subscribe";
import { trackSchema } from "@/lib/validations/track";
import { makeProduct, resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function outOfStockVariant() {
  const p = await makeProduct({
    slug: "rare",
    variants: [{ sku: "R-1", priceCents: 30_000, stock: 0 }],
  });
  return p.variants[0];
}

describe("funnel tracking", () => {
  it("records an anonymous step with the visit id and the product", async () => {
    const p = await makeProduct({
      slug: "beans",
      variants: [{ sku: "B-1", priceCents: 10_000, stock: 3 }],
    });
    await trackEvent({ type: "PRODUCT_VIEW", sessionId: "abc123", productId: p.id });
    const row = await db.analyticsEvent.findFirstOrThrow();
    expect(row).toMatchObject({
      type: "PRODUCT_VIEW",
      sessionId: "abc123",
      productId: p.id,
      userId: null,
      orderId: null,
    });
  });

  it("the browser can only report the three browsing steps", () => {
    expect(trackSchema.safeParse({ type: "ADD_TO_CART", productId: "x" }).success).toBe(true);
    expect(trackSchema.safeParse({ type: "ORDER_PLACED" }).success).toBe(false); // the server records that itself
    expect(
      trackSchema.safeParse({ type: "PRODUCT_VIEW", productId: "x".repeat(200) }).success,
    ).toBe(false);
  });
});

describe("back in stock", () => {
  const base = { email: "wait@example.com", locale: "en" } as const;

  it("a request needs its variant, and the other lists must not carry one", () => {
    expect(subscribeSchema.safeParse({ ...base, source: "back-in-stock" }).success).toBe(false);
    expect(
      subscribeSchema.safeParse({ ...base, source: "back-in-stock", variantId: "v1" }).success,
    ).toBe(true);
    expect(
      subscribeSchema.safeParse({ ...base, source: "newsletter", variantId: "v1" }).success,
    ).toBe(false);
  });

  it("rejects an unknown variant and keeps one request per person and variant", async () => {
    await expect(
      subscribe({ ...base, source: "back-in-stock", variantId: "nope" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const v = await outOfStockVariant();
    await subscribe({ ...base, source: "back-in-stock", variantId: v.id });
    await subscribe({ ...base, source: "back-in-stock", variantId: v.id });
    expect(await db.subscriber.count()).toBe(1);
  });

  it("emails the people waiting once the item is back, and only once", async () => {
    const v = await outOfStockVariant();
    await subscribe({
      email: "a@example.com",
      source: "back-in-stock",
      variantId: v.id,
      locale: "ar",
    });
    await subscribe({
      email: "b@example.com",
      source: "back-in-stock",
      variantId: v.id,
      locale: "en",
    });

    expect(await notifyBackInStock()).toBe(0); // still out of stock
    expect(await db.emailLog.count()).toBe(0);

    await db.productVariant.update({ where: { id: v.id }, data: { stock: 4 } });
    expect(await notifyBackInStock()).toBe(2);
    expect(await notifyBackInStock()).toBe(0); // nobody is told twice

    const mails = await db.emailLog.findMany({
      where: { type: "back_in_stock" },
      orderBy: { to: "asc" },
    });
    expect(mails.map((m) => m.to)).toEqual(["a@example.com", "b@example.com"]);
    expect(mails[0].html).toContain('dir="rtl"'); // the Arabic reader gets the Arabic email
    expect(mails[1].html).toContain("back in stock");
    expect(mails[1].html).toContain("/en/products/rare");
  });

  it("asking again after being told means tell me again", async () => {
    const v = await outOfStockVariant();
    await subscribe({ ...base, source: "back-in-stock", variantId: v.id });
    await db.productVariant.update({ where: { id: v.id }, data: { stock: 2 } });
    await notifyBackInStock();
    await db.productVariant.update({ where: { id: v.id }, data: { stock: 0 } });
    await subscribe({ ...base, source: "back-in-stock", variantId: v.id });
    expect((await db.subscriber.findFirstOrThrow()).notifiedAt).toBeNull();
    await db.productVariant.update({ where: { id: v.id }, data: { stock: 5 } });
    expect(await notifyBackInStock()).toBe(1);
  });

  it("ignores archived variants", async () => {
    const v = await outOfStockVariant();
    await subscribe({ ...base, source: "back-in-stock", variantId: v.id });
    await db.productVariant.update({ where: { id: v.id }, data: { stock: 5, isArchived: true } });
    expect(await notifyBackInStock()).toBe(0);
  });
});
