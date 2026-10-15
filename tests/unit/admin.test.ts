import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createOrder, confirmPayment } from "@/lib/services/orders";
import {
  bulkUpdateOrderStatus,
  listOrders,
  refundOrder,
  updateOrderStatus,
} from "@/lib/services/admin-orders";
import { adjustInventory, createProduct, updateProduct } from "@/lib/services/admin-products";
import { getCodOutstanding, getSummary, getTimeseries, pctChange } from "@/lib/services/analytics";
import { orderQuerySchema } from "@/lib/validations/admin-orders";
import { resolveRange } from "@/lib/validations/analytics";
import {
  address,
  L,
  makeProduct,
  makeUser,
  makeZone,
  rawOrder,
  resetDb,
  stockOf,
} from "./fixtures";

const query = (params: Record<string, string> = {}) => orderQuerySchema.parse(params);

let userId: string;
let adminId: string;
let variantId: string;
let categoryId: string;

beforeEach(async () => {
  await resetDb();
  await makeZone();
  userId = (await makeUser("ann@test.dev", "Ann Smith")).id;
  adminId = (await makeUser("root@test.dev", "Root", "ADMIN")).id;
  const p = await makeProduct({
    slug: "p",
    variants: [{ sku: "S1", priceCents: 10000, stock: 10 }],
  });
  variantId = p.variants[0].id;
  categoryId = p.categoryId;
});

afterAll(() => db.$disconnect());

const stock = () => stockOf(variantId);
const order = async (qty: number, method: "CARD" | "COD" = "CARD", pay = true) => {
  const o = await createOrder({
    userId,
    lines: [{ variantId, quantity: qty }],
    address,
    paymentMethod: method,
    locale: "en",
  });
  if (method === "CARD" && pay) await confirmPayment(o.paymentRef!);
  return o;
};

describe("updateOrderStatus", () => {
  it("moves CONFIRMED -> SHIPPED -> DELIVERED without touching stock, and writes the history with the actor", async () => {
    const o = await order(3);
    await updateOrderStatus(o.id, "SHIPPED", adminId);
    await updateOrderStatus(o.id, "DELIVERED", adminId);
    expect(await stock()).toBe(7);
    const events = await db.orderEvent.findMany({
      where: { orderId: o.id, type: "status_changed" },
      orderBy: { createdAt: "asc" },
    });
    expect(events.map((e) => `${e.fromStatus}>${e.toStatus}`)).toEqual([
      "CONFIRMED>SHIPPED",
      "SHIPPED>DELIVERED",
    ]);
    expect(events.every((e) => e.actorId === adminId)).toBe(true);
  });

  it("cancelling a paid order returns the stock and refunds the payment", async () => {
    const o = await order(3);
    const res = await updateOrderStatus(o.id, "CANCELLED", adminId);
    expect(res).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });
    expect(await stock()).toBe(10);
    expect(
      await db.inventoryLog.findFirstOrThrow({ where: { reason: "CANCELLATION" } }),
    ).toMatchObject({ change: 3, orderId: o.id });
  });

  it("cancelling a cash-on-delivery order returns the stock; nothing was paid so nothing is refunded", async () => {
    const o = await order(2, "COD");
    expect(await stock()).toBe(8);
    expect(await updateOrderStatus(o.id, "CANCELLED", adminId)).toMatchObject({
      paymentStatus: "UNPAID",
    });
    expect(await stock()).toBe(10);
  });

  it("delivering a cash-on-delivery order marks it paid (the money was collected)", async () => {
    const o = await order(1, "COD");
    await updateOrderStatus(o.id, "SHIPPED", adminId);
    expect(await updateOrderStatus(o.id, "DELIVERED", adminId)).toMatchObject({
      paymentStatus: "PAID",
    });
    expect(
      await db.orderEvent.count({
        where: { orderId: o.id, type: "payment_succeeded", note: "cod_collected" },
      }),
    ).toBe(1);
  });

  it("does not restock when a PENDING order is cancelled (stock was never taken)", async () => {
    const o = await order(3, "CARD", false);
    await updateOrderStatus(o.id, "CANCELLED", adminId);
    expect(await stock()).toBe(10);
  });

  it("rejects going backwards, cancelling after shipping, and cancelling twice", async () => {
    const o = await order(3);
    await expect(updateOrderStatus(o.id, "PENDING")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    await updateOrderStatus(o.id, "SHIPPED", adminId);
    await expect(updateOrderStatus(o.id, "CANCELLED")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });

    const o2 = await order(1);
    await updateOrderStatus(o2.id, "CANCELLED", adminId);
    await expect(updateOrderStatus(o2.id, "CANCELLED")).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
    expect(await stock()).toBe(7); // o's 3 still out, o2's 1 returned exactly once
  });

  it("restocks only once when two admins cancel at the same time", async () => {
    const o = await order(3);
    const results = await Promise.allSettled([
      updateOrderStatus(o.id, "CANCELLED"),
      updateOrderStatus(o.id, "CANCELLED"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await stock()).toBe(10);
  });

  it("bulk update reports skipped orders instead of failing the whole batch", async () => {
    const a = await order(1);
    const b = await order(1, "CARD", false); // PENDING can't ship
    const res = await bulkUpdateOrderStatus([a.id, b.id], "SHIPPED", adminId);
    expect(res.changed).toEqual([a.id]);
    expect(res.skipped.map((s) => s.id)).toEqual([b.id]);
    expect(res.skipped[0].code).toBe("INVALID_TRANSITION");
  });
});

describe("refundOrder", () => {
  it("before shipping it is a cancellation: stock returns", async () => {
    const o = await order(3);
    expect(await refundOrder(o.id, adminId)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "REFUNDED",
    });
    expect(await stock()).toBe(10);
  });

  it("after delivery only the payment is refunded: status stays, stock does not return", async () => {
    const o = await order(3);
    await updateOrderStatus(o.id, "SHIPPED", adminId);
    await updateOrderStatus(o.id, "DELIVERED", adminId);
    expect(await refundOrder(o.id, adminId)).toMatchObject({
      status: "DELIVERED",
      paymentStatus: "REFUNDED",
    });
    expect(await stock()).toBe(7);
    expect(
      await db.orderEvent.count({ where: { orderId: o.id, type: "refunded", actorId: adminId } }),
    ).toBe(1);
  });

  it("refuses unpaid, pending, cancelled and already refunded orders", async () => {
    const cod = await order(1, "COD"); // unpaid
    await expect(refundOrder(cod.id)).rejects.toMatchObject({ code: "NOT_REFUNDABLE" });
    const pending = await order(1, "CARD", false);
    await expect(refundOrder(pending.id)).rejects.toMatchObject({ code: "NOT_REFUNDABLE" });
    const paid = await order(1);
    await refundOrder(paid.id);
    await expect(refundOrder(paid.id)).rejects.toMatchObject({ code: "NOT_REFUNDABLE" });
  });
});

describe("listOrders", () => {
  beforeEach(async () => {
    const other = await makeUser("bob@test.dev", "Bob Jones");
    const base = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 12; i++) {
      await rawOrder(i % 3 === 0 ? other.id : userId, {
        status: i % 2 ? "CONFIRMED" : "DELIVERED",
        paymentMethod: i % 4 === 0 ? "COD" : "CARD",
        paymentStatus: i % 4 === 0 ? "UNPAID" : "PAID",
        cents: 1000 * (i + 1) * 10,
        subtotalCents: 1000 * (i + 1) * 10,
        totalCents: 1000 * (i + 1) * 10,
        shippingAddress: { governorate: i < 4 ? "C" : "ALX" },
        createdAt: new Date(base + i * 86_400_000),
      });
    }
  });

  it("paginates on the server with stable totals", async () => {
    const p1 = await listOrders(query({ pageSize: "10" }));
    const p2 = await listOrders(query({ pageSize: "10", page: "2" }));
    expect(p1.total).toBe(12);
    expect(p1.pageCount).toBe(2);
    expect(p1.items).toHaveLength(10);
    expect(p2.items).toHaveLength(2);
    expect(new Set([...p1.items, ...p2.items].map((o) => o.id)).size).toBe(12);
  });

  it("sorts by any allowed column and falls back safely on junk input", async () => {
    const asc = await listOrders(query({ sort: "totalCents:asc" }));
    expect(asc.items[0].totalCents).toBe(10000);
    const bad = await listOrders(query({ sort: "passwordHash:asc" }));
    expect(bad.items[0].totalCents).toBe(120000); // default: createdAt desc
  });

  it("filters by status, payment, method, governorate, date range, total range and search", async () => {
    expect((await listOrders(query({ status: "CONFIRMED" }))).total).toBe(6);
    expect((await listOrders(query({ payment: "UNPAID" }))).total).toBe(3);
    expect((await listOrders(query({ method: "COD" }))).total).toBe(3);
    expect((await listOrders(query({ governorate: "C" }))).total).toBe(4);
    expect((await listOrders(query({ governorate: "C,ALX" }))).total).toBe(12);
    expect((await listOrders(query({ governorate: "XX" }))).total).toBe(12); // unknown codes are ignored
    expect((await listOrders(query({ from: "2026-01-01", to: "2026-01-03" }))).total).toBe(3);
    expect((await listOrders(query({ minTotal: "300", maxTotal: "600" }))).total).toBe(4);
    expect((await listOrders(query({ q: "bob" }))).total).toBe(4);
    expect((await listOrders(query({ q: "ann@test" }))).total).toBe(8);
    const num = (await listOrders(query({ sort: "orderNumber:asc" }))).items[0].orderNumber;
    expect((await listOrders(query({ q: `#${num}` }))).total).toBe(1);
  });

  it("combines filters", async () => {
    const r = await listOrders(query({ q: "bob", status: "DELIVERED" }));
    expect(r.items.every((o) => o.customerName === "Bob Jones" && o.status === "DELIVERED")).toBe(
      true,
    );
  });
});

describe("analytics", () => {
  const at = (day: number, hour = 12) => new Date(Date.UTC(2026, 5, day, hour));

  it("counts only confirmed, shipped and delivered orders that were not refunded, by confirmation date", async () => {
    await rawOrder(userId, { cents: 30000, createdAt: at(11) });
    await rawOrder(userId, { cents: 10000, status: "SHIPPED", createdAt: at(12) });
    await rawOrder(userId, { cents: 99999, status: "CANCELLED", createdAt: at(13) }); // ignored
    await rawOrder(userId, {
      cents: 88888,
      status: "PENDING",
      paymentStatus: "UNPAID",
      confirmedAt: null,
      createdAt: at(13),
    }); // ignored
    await rawOrder(userId, { cents: 77777, paymentStatus: "REFUNDED", createdAt: at(14) }); // refunded: ignored
    await rawOrder(userId, { cents: 20000, createdAt: at(5) }); // previous period

    const r = resolveRange({ from: "2026-06-10", to: "2026-06-19" }, at(30));
    const { current, previous } = await getSummary(r, r.previous);
    expect(current).toMatchObject({ salesCents: 40000, orders: 2, aovCents: 20000 });
    expect(previous).toMatchObject({ salesCents: 20000, orders: 1 });
    expect(pctChange(current.salesCents, previous.salesCents)).toBe(100);
    expect(pctChange(5, 0)).toBeNull();

    const series = await getTimeseries(r, "day", r.fromDate, r.toDate);
    expect(series).toHaveLength(10);
    expect(series.find((s) => s.date === "2026-06-11")?.salesCents).toBe(30000);
    expect(series.find((s) => s.date === "2026-06-15")?.salesCents).toBe(0); // gap filled
  });

  it("uses the order's confirmation date, not its creation date", async () => {
    await rawOrder(userId, { cents: 10000, createdAt: at(9), confirmedAt: at(12) }); // created before the period
    const r = resolveRange({ from: "2026-06-10", to: "2026-06-19" }, at(30));
    expect((await getSummary(r, r.previous)).current.orders).toBe(1);
  });

  it("buckets by the Cairo calendar day: 22:30 UTC in June is already the next day in Cairo", async () => {
    await rawOrder(userId, { cents: 10000, createdAt: new Date(Date.UTC(2026, 5, 10, 22, 30)) });
    const r = resolveRange({ from: "2026-06-10", to: "2026-06-12" }, at(30));
    const series = await getTimeseries(r, "day", r.fromDate, r.toDate);
    expect(series.find((s) => s.date === "2026-06-10")?.salesCents).toBe(0);
    expect(series.find((s) => s.date === "2026-06-11")?.salesCents).toBe(10000);
  });

  it("a new customer is someone whose first counted order falls in the period", async () => {
    const bob = await makeUser("bob@test.dev", "Bob");
    await rawOrder(userId, { createdAt: at(1) }); // Ann's first order is before the period
    await rawOrder(userId, { createdAt: at(12) });
    await rawOrder(bob.id, { createdAt: at(13) }); // Bob's first order is inside it
    const r = resolveRange({ from: "2026-06-10", to: "2026-06-19" }, at(30));
    expect((await getSummary(r, r.previous)).current.newCustomers).toBe(1);
  });

  it("reports cash on delivery still to collect", async () => {
    await rawOrder(userId, { cents: 30000, paymentMethod: "COD", paymentStatus: "UNPAID" });
    await rawOrder(userId, { cents: 10000, paymentMethod: "COD", paymentStatus: "PAID" }); // collected
    await rawOrder(userId, {
      cents: 55555,
      paymentMethod: "COD",
      paymentStatus: "UNPAID",
      status: "CANCELLED",
    });
    expect(await getCodOutstanding()).toEqual({ totalCents: 30000, orders: 1 });
  });
});

describe("admin products", () => {
  const variant = (over = {}) => ({
    name: L("250g", "250 جم"),
    sku: "NB-1",
    price: 125.5,
    stock: 20,
    lowStockThreshold: 5,
    isArchived: false,
    ...over,
  });
  const input = (over = {}) => ({
    name: L("New Beans", "بن جديد"),
    slug: "new-beans",
    description: L("Fresh roasted", "محمص طازج"),
    origin: "Kenya",
    roastLevel: "LIGHT" as const,
    tastingNotes: ["citrus"],
    categoryId,
    images: [],
    isActive: true,
    variants: [variant()],
    ...over,
  });

  it("creates a bilingual product with prices in qirsh, searchable text and an opening stock log", async () => {
    const p = await createProduct(input(), adminId);
    expect(p.variants[0].priceCents).toBe(12550);
    expect(p.name).toEqual({ en: "New Beans", ar: "بن جديد" });
    expect(p.searchText).toContain("new beans");
    expect(p.searchText).toContain("بن جديد");
    expect(
      await db.inventoryLog.count({
        where: { variantId: p.variants[0].id, reason: "RESTOCK", actorId: adminId },
      }),
    ).toBe(1);
  });

  it("rejects duplicate slugs and SKUs", async () => {
    await createProduct(input());
    await expect(createProduct(input())).rejects.toMatchObject({ code: "SLUG_TAKEN" });
    await expect(createProduct(input({ slug: "other" }))).rejects.toMatchObject({
      code: "SKU_TAKEN",
    });
  });

  it("update keeps existing stock; adding a variant sets its opening stock; archiving hides a variant", async () => {
    const p = await createProduct(input());
    const v = p.variants[0];
    await updateProduct(p.id, {
      ...input(),
      variants: [
        variant({ id: v.id, price: 150, stock: 999, lowStockThreshold: 2, isArchived: true }),
        variant({
          name: L("1kg", "1 كجم"),
          sku: "NB-2",
          price: 400,
          stock: 7,
          lowStockThreshold: 2,
        }),
      ],
    });
    const after = await db.productVariant.findMany({
      where: { productId: p.id },
      orderBy: { sku: "asc" },
    });
    expect(after[0]).toMatchObject({
      priceCents: 15000,
      stock: 20,
      lowStockThreshold: 2,
      isArchived: true,
    }); // stock ignored
    expect(after[1]).toMatchObject({ stock: 7, isArchived: false });
  });

  it("adjustInventory logs the delta with its reason and who did it", async () => {
    const r = await adjustInventory(variantId, 4, "Damaged in transit", adminId);
    expect(r).toMatchObject({ stock: 4, delta: -6 });
    expect(
      await db.inventoryLog.findFirstOrThrow({ where: { reason: "MANUAL_ADJUSTMENT" } }),
    ).toMatchObject({
      change: -6,
      note: "Damaged in transit",
      actorId: adminId,
    });
  });
});
