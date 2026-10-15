import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { listOrders } from "@/lib/services/admin-orders";
import { customerQuerySchema, listCustomers } from "@/lib/services/admin-customers";
import { ordersCsvStream } from "@/lib/services/export";
import {
  getSalesByCategory,
  getStatusDistribution,
  getTimeseriesWithComparison,
  getTopProducts,
} from "@/lib/services/analytics";
import { orderFiltersSchema, orderQuerySchema } from "@/lib/validations/admin-orders";
import { resolveRange } from "@/lib/validations/analytics";
import { L, makeProduct, makeUser, rawOrder, resetDb } from "./fixtures";

// noon UTC is the same calendar day in Cairo, in winter and in summer
const day = (d: number) => new Date(Date.UTC(2026, 5, d, 12));
const range = resolveRange({ from: "2026-06-10", to: "2026-06-19" }, day(30));

let ann: string;
let bob: string;

type Status = "CONFIRMED" | "CANCELLED" | "SHIPPED";
async function order(
  userId: string,
  status: Status,
  d: number,
  lines: { variantId: string; price: number; qty: number }[],
) {
  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  return rawOrder(userId, {
    status,
    cents: subtotal,
    subtotalCents: subtotal,
    totalCents: subtotal,
    createdAt: day(d),
    items: {
      create: lines.map((l) => ({
        variantId: l.variantId,
        productName: L("n"),
        variantName: L("v"),
        unitPriceCents: l.price,
        quantity: l.qty,
      })),
    },
  });
}

const variantOf = async (slug: string) =>
  (await db.productVariant.findFirstOrThrow({ where: { product: { slug } } })).id;

beforeEach(async () => {
  await resetDb();
  ann = (await makeUser("ann@t.dev", "Ann")).id;
  bob = (await makeUser("bob@t.dev", "Bob")).id;
  await makeUser("root@t.dev", "Root", "ADMIN");
  await makeProduct({
    slug: "ethiopia",
    categorySlug: "beans",
    variants: [{ sku: "ethiopia", priceCents: 1000, stock: 99 }],
  });
  await makeProduct({
    slug: "kettle",
    categorySlug: "gear",
    variants: [{ sku: "kettle", priceCents: 1000, stock: 99 }],
  });
});

afterAll(() => db.$disconnect());

describe("analytics breakdowns", () => {
  it("groups sales by category and ranks top products, ignoring cancelled orders", async () => {
    const eth = await variantOf("ethiopia");
    const ket = await variantOf("kettle");
    await order(ann, "CONFIRMED", 11, [
      { variantId: eth, price: 1000, qty: 3 },
      { variantId: ket, price: 2500, qty: 1 },
    ]);
    await order(bob, "SHIPPED", 12, [{ variantId: eth, price: 1000, qty: 1 }]);
    await order(bob, "CANCELLED", 13, [{ variantId: ket, price: 2500, qty: 10 }]);

    const cats = await getSalesByCategory(range);
    expect(cats).toEqual([
      expect.objectContaining({ slug: "beans", salesCents: 4000, units: 4 }),
      expect.objectContaining({ slug: "gear", salesCents: 2500, units: 1 }),
    ]);
    const top = await getTopProducts(range, 10);
    expect(top.map((t) => t.slug)).toEqual(["ethiopia", "kettle"]);
    expect(top[0].units).toBe(4);
    expect(top[0].name).toMatchObject({ en: expect.any(String), ar: expect.any(String) }); // both languages come back
  });

  it("counts every status per week for the stacked chart", async () => {
    const eth = await variantOf("ethiopia");
    await order(ann, "CONFIRMED", 11, [{ variantId: eth, price: 1000, qty: 1 }]);
    await order(ann, "CANCELLED", 12, [{ variantId: eth, price: 1000, qty: 1 }]);
    const weeks = await getStatusDistribution(range);
    const total = weeks.reduce((n, w) => n + w.CONFIRMED + w.CANCELLED, 0);
    expect(total).toBe(2);
    expect(weeks[0]).toHaveProperty("DELIVERED", 0);
  });

  it("aligns the previous period with the current one bucket by bucket", async () => {
    const eth = await variantOf("ethiopia");
    await order(ann, "CONFIRMED", 11, [{ variantId: eth, price: 1000, qty: 1 }]); // current, day index 1
    await order(ann, "CONFIRMED", 1, [{ variantId: eth, price: 700, qty: 1 }]); // previous period, day index 1
    const pts = await getTimeseriesWithComparison(range, range.previous, "day");
    expect(pts).toHaveLength(10);
    expect(pts[1]).toMatchObject({
      salesCents: 1000,
      previousSalesCents: 700,
      previousDate: "2026-06-01",
    });
  });
});

describe("range resolution (Cairo days)", () => {
  const now = new Date(Date.UTC(2026, 5, 30, 15)); // 18:00 in Cairo, still June 30

  it("defaults to the last 30 days ending today, with Cairo midnight boundaries", () => {
    const r = resolveRange({}, now);
    expect(r.fromDate).toBe("2026-06-01");
    expect(r.toDate).toBe("2026-06-30");
    // Cairo is UTC+3 in June: its midnight is 21:00 UTC the evening before
    expect(r.from.toISOString()).toBe("2026-05-31T21:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-06-30T21:00:00.000Z");
    expect(r.granularity).toBe("day");
    expect(r.previous).toMatchObject({ fromDate: "2026-05-02", toDate: "2026-05-31" });
  });

  it("late evening UTC is already tomorrow in Cairo", () => {
    expect(resolveRange({}, new Date(Date.UTC(2026, 5, 30, 22, 30))).toDate).toBe("2026-07-01");
  });

  it("uses UTC+2 in winter", () => {
    const r = resolveRange({ from: "2026-01-10", to: "2026-01-10" }, now);
    expect(r.from.toISOString()).toBe("2026-01-09T22:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-01-10T22:00:00.000Z");
  });

  it("treats `to` as inclusive and picks coarser buckets for long spans", () => {
    const r = resolveRange({ from: "2026-01-01", to: "2026-06-30" }, now);
    expect(r.toDate).toBe("2026-06-30");
    expect(r.granularity).toBe("week");
  });

  it("clamps absurd spans and inverted ranges", () => {
    expect(
      resolveRange({ from: "2000-01-01", to: "2026-06-30" }, now).fromDate.startsWith("2025"),
    ).toBe(true);
    const inverted = resolveRange({ from: "2026-06-20", to: "2026-06-10" }, now);
    expect(inverted.from < inverted.to).toBe(true);
  });
});

describe("drill-down filters", () => {
  it("filters orders by category and by product", async () => {
    const eth = await variantOf("ethiopia");
    const ket = await variantOf("kettle");
    await order(ann, "CONFIRMED", 11, [{ variantId: eth, price: 1000, qty: 1 }]);
    await order(ann, "CONFIRMED", 12, [{ variantId: ket, price: 2500, qty: 1 }]);
    await order(bob, "CONFIRMED", 13, [
      { variantId: eth, price: 1000, qty: 1 },
      { variantId: ket, price: 2500, qty: 1 },
    ]);

    expect((await listOrders(orderQuerySchema.parse({ category: "beans" }))).total).toBe(2);
    expect((await listOrders(orderQuerySchema.parse({ product: "kettle" }))).total).toBe(2);
    expect(
      (await listOrders(orderQuerySchema.parse({ category: "beans", product: "kettle" }))).total,
    ).toBe(1);
  });
});

describe("customers", () => {
  beforeEach(async () => {
    const eth = await variantOf("ethiopia");
    await order(ann, "CONFIRMED", 11, [{ variantId: eth, price: 1000, qty: 5 }]);
    await order(ann, "SHIPPED", 15, [{ variantId: eth, price: 1000, qty: 1 }]);
    await order(bob, "CONFIRMED", 12, [{ variantId: eth, price: 1000, qty: 2 }]);
    await order(bob, "CANCELLED", 14, [{ variantId: eth, price: 1000, qty: 50 }]);
  });

  it("computes lifetime value from counted orders only, and excludes staff accounts", async () => {
    const res = await listCustomers(customerQuerySchema.parse({}));
    expect(res.total).toBe(2);
    expect(res.items[0]).toMatchObject({ name: "Ann", orders: 2, spentCents: 6000 });
    expect(res.items[1]).toMatchObject({ name: "Bob", orders: 1, spentCents: 2000 });
    expect(res.items[0].lastPurchase).toBe(day(15).toISOString());
  });

  it("sorts, searches and rejects unknown sort columns safely", async () => {
    const byName = await listCustomers(customerQuerySchema.parse({ sort: "name", dir: "asc" }));
    expect(byName.items.map((c) => c.name)).toEqual(["Ann", "Bob"]);
    expect((await listCustomers(customerQuerySchema.parse({ q: "bob@" }))).total).toBe(1);
    const injected = await listCustomers(customerQuerySchema.parse({ sort: "name; DROP TABLE x" }));
    expect(injected.total).toBe(2); // falls back to the default sort
  });

  it("includes customers who never bought", async () => {
    await makeUser("new@t.dev", "Zed");
    const res = await listCustomers(customerQuerySchema.parse({ sort: "last", dir: "asc" }));
    expect(res.total).toBe(3);
    expect(res.items.find((c) => c.name === "Zed")).toMatchObject({
      orders: 0,
      spentCents: 0,
      lastPurchase: null,
    });
  });
});

describe("CSV export", () => {
  async function readAll(stream: ReadableStream<Uint8Array>) {
    const reader = stream.getReader();
    const chunks: string[] = [];
    const decoder = new TextDecoder("utf-8", { ignoreBOM: true }); // keep the BOM so we can assert it
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }
    return chunks;
  }

  it("streams a header plus one row per matching order, honoring filters", async () => {
    const eth = await variantOf("ethiopia");
    for (let i = 0; i < 5; i++)
      await order(ann, "CONFIRMED", 11 + i, [{ variantId: eth, price: 1000, qty: 1 }]);
    await order(bob, "CANCELLED", 12, [{ variantId: eth, price: 1000, qty: 1 }]);

    const all = (await readAll(ordersCsvStream(orderFiltersSchema.parse({})))).join("");
    expect(all.startsWith("﻿Order #,Confirmed at (UTC),Status,Payment status,Payment method")).toBe(
      true,
    );
    expect(all.trim().split("\r\n")).toHaveLength(1 + 6);

    const confirmed = (
      await readAll(ordersCsvStream(orderFiltersSchema.parse({ status: "CONFIRMED" })))
    ).join("");
    expect(confirmed.trim().split("\r\n")).toHaveLength(1 + 5);
    expect(confirmed).toContain("10.00");
    expect(confirmed).not.toContain("CANCELLED");
  });

  it("emits only the header when nothing matches", async () => {
    const out = (await readAll(ordersCsvStream(orderFiltersSchema.parse({ q: "nobody" })))).join(
      "",
    );
    expect(out.trim().split("\r\n")).toHaveLength(1);
  });

  it("pages through large result sets in several chunks without losing or repeating rows", async () => {
    await db.order.createMany({
      data: Array.from({ length: 4500 }, (_, i) => ({
        userId: ann,
        status: "CONFIRMED" as const,
        paymentMethod: "CARD" as const,
        paymentStatus: "PAID" as const,
        subtotalCents: 1000 + i,
        shippingCents: 0,
        vatCents: 0,
        totalCents: 1000 + i,
        shippingAddress: {},
        createdAt: day(11),
        confirmedAt: day(11),
      })),
    });

    const chunks = await readAll(ordersCsvStream(orderFiltersSchema.parse({})));
    expect(chunks.length).toBeGreaterThanOrEqual(3); // 2000 + 2000 + 500
    const lines = chunks.join("").trim().split("\r\n");
    expect(lines).toHaveLength(1 + 4500);
    expect(new Set(lines.slice(1).map((l) => l.split(",")[0])).size).toBe(4500); // unique order numbers
  });
});
