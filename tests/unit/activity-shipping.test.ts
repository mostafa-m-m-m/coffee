import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { GOVERNORATES } from "@/lib/geo";
import { listActivity, activityQuerySchema } from "@/lib/services/activity";
import { adjustInventory, setProductActive, updateProduct } from "@/lib/services/admin-products";
import { updateOrderStatus } from "@/lib/services/admin-orders";
import { quoteShipping, updateZone } from "@/lib/services/shipping";
import { L, makeProduct, makeUser, makeZone, rawOrder, resetDb } from "./fixtures";

const query = (params: Record<string, string> = {}) => activityQuerySchema.parse(params);

let adminId: string;
let cairo: Awaited<ReturnType<typeof makeZone>>;
let rest: Awaited<ReturnType<typeof makeZone>>;

beforeEach(async () => {
  await resetDb();
  adminId = (await makeUser("admin@t.test", "Admin Ali", "ADMIN")).id;
  cairo = await makeZone();
  rest = await makeZone({
    name: L("Everywhere else", "باقي الجمهورية"),
    governorates: GOVERNORATES.filter((g) => !["C", "GZ", "KB"].includes(g)),
    feeCents: 8000,
    etaDays: 5,
  });
});
afterAll(() => db.$disconnect());

describe("shipping zones", () => {
  it("quotes the fee and delivery time of the governorate's zone, free above the threshold", async () => {
    expect(await quoteShipping("C")).toMatchObject({ feeCents: 5000, etaDays: 2 });
    expect(await quoteShipping("AST", 20000)).toMatchObject({
      feeCents: 8000,
      shippingCents: 8000,
    });
    expect(await quoteShipping("AST", 150000)).toMatchObject({ shippingCents: 0 });
    await expect(quoteShipping("XX")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("updates fee and days and records who did it", async () => {
    await updateZone(cairo.id, { fee: 60, etaDays: 3, governorates: ["C", "GZ", "KB"] }, adminId);
    expect(await db.shippingZone.findUnique({ where: { id: cairo.id } })).toMatchObject({
      feeCents: 6000,
      etaDays: 3,
    });
    const log = await db.activityLog.findFirstOrThrow({ where: { entity: "shipping_zone" } });
    expect(log).toMatchObject({
      actorId: adminId,
      action: "shipping_zone_updated",
      label: "Greater Cairo",
    });
    expect(log.details).toMatchObject({ feeFrom: 5000, feeTo: 6000, etaFrom: 2, etaTo: 3 });
  });

  it("moves a governorate between zones: each belongs to exactly one", async () => {
    await updateZone(
      cairo.id,
      { fee: 50, etaDays: 2, governorates: ["C", "GZ", "KB", "ALX"] },
      adminId,
    );
    const [a, b] = await Promise.all([
      db.shippingZone.findUniqueOrThrow({ where: { id: cairo.id } }),
      db.shippingZone.findUniqueOrThrow({ where: { id: rest.id } }),
    ]);
    expect(a.governorates).toContain("ALX");
    expect(b.governorates).not.toContain("ALX");
    expect((await quoteShipping("ALX")).feeCents).toBe(5000);
  });

  it("refuses an edit that would leave a governorate without a zone", async () => {
    await expect(
      updateZone(cairo.id, { fee: 50, etaDays: 2, governorates: ["C", "GZ"] }, adminId),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      fields: { governorates: "validation.governoratesUncovered" },
    });
    expect(
      (await db.shippingZone.findUniqueOrThrow({ where: { id: cairo.id } })).governorates,
    ).toHaveLength(3);
    await expect(
      updateZone("missing", { fee: 1, etaDays: 1, governorates: ["C"] }, adminId),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("activity feed", () => {
  it("collects order, stock, product and shipping changes, newest first, with who did them", async () => {
    const customer = await makeUser("buyer@t.test", "Buyer");
    const p = await makeProduct({
      slug: "beans",
      variants: [{ sku: "B1", priceCents: 10000, stock: 10 }],
    });
    const order = await rawOrder(customer.id, {
      cents: 20000,
      status: "CONFIRMED",
      paymentMethod: "COD",
    });

    await updateOrderStatus(order.id, "SHIPPED", adminId);
    await adjustInventory(p.variants[0].id, 25, "stock count", adminId);
    await updateProduct(
      p.id,
      {
        name: L("Beans", "بن"),
        slug: "beans",
        description: L("d", "و"),
        origin: "Kenya",
        roastLevel: "LIGHT",
        tastingNotes: [],
        categoryId: p.categoryId,
        images: [],
        isActive: true,
        variants: [
          {
            id: p.variants[0].id,
            name: L("250g", "250"),
            sku: "B1",
            price: 120,
            stock: 25,
            lowStockThreshold: 5,
            isArchived: false,
          },
        ],
      },
      adminId,
    );
    await setProductActive(p.id, false, adminId);
    await updateZone(cairo.id, { fee: 55, etaDays: 2, governorates: ["C", "GZ", "KB"] }, adminId);

    const feed = await listActivity(query());
    const actions = feed.items.map((e) => e.action);
    expect(actions).toEqual(
      expect.arrayContaining([
        "status_changed",
        "MANUAL_ADJUSTMENT",
        "product_updated",
        "price_changed",
        "product_archived",
        "shipping_zone_updated",
      ]),
    );
    expect(feed.items.every((e) => e.actor?.name === "Admin Ali")).toBe(true);
    expect([...feed.items].map((e) => e.at)).toEqual(
      [...feed.items.map((e) => e.at)].sort().reverse(),
    );

    const price = feed.items.find((e) => e.action === "price_changed")!;
    expect(price.details).toMatchObject({ from: 10000, to: 12000 });
    const status = feed.items.find((e) => e.action === "status_changed")!;
    expect(status).toMatchObject({ kind: "order", details: { from: "CONFIRMED", to: "SHIPPED" } });
    expect(status.subject.orderNumber).toBe(order.orderNumber);
  });

  it("filters by type, by who (a person or the system) and by date", async () => {
    const customer = await makeUser("buyer@t.test", "Buyer");
    const order = await rawOrder(customer.id, {
      cents: 20000,
      status: "PENDING",
      paymentMethod: "CARD",
    });
    await db.orderEvent.create({
      data: { orderId: order.id, type: "expired", fromStatus: "PENDING", toStatus: "CANCELLED" },
    });
    await updateZone(cairo.id, { fee: 55, etaDays: 2, governorates: ["C", "GZ", "KB"] }, adminId);

    expect((await listActivity(query({ kind: "shipping" }))).items.map((e) => e.action)).toEqual([
      "shipping_zone_updated",
    ]);
    const system = await listActivity(query({ actor: "system" }));
    expect(system.items.map((e) => e.action)).toEqual(["expired"]);
    expect(system.items[0].actor).toBeNull();
    expect((await listActivity(query({ actor: adminId }))).total).toBe(1);

    const today = new Date().toISOString().slice(0, 10);
    expect((await listActivity(query({ from: today, to: today }))).total).toBeGreaterThan(0);
    expect((await listActivity(query({ from: "2020-01-01", to: "2020-01-02" }))).total).toBe(0);
  });

  it("leaves out sales and opening stock: they are not admin activity", async () => {
    const p = await makeProduct({
      slug: "beans",
      variants: [{ sku: "B1", priceCents: 10000, stock: 10 }],
    });
    await db.inventoryLog.create({
      data: { variantId: p.variants[0].id, change: -1, reason: "SALE" },
    });
    await db.inventoryLog.create({
      data: {
        variantId: p.variants[0].id,
        change: 10,
        reason: "RESTOCK",
        note: "Initial stock",
        actorId: adminId,
      },
    });
    expect((await listActivity(query())).total).toBe(0);
  });

  it("paginates", async () => {
    for (let i = 0; i < 7; i++) {
      await updateZone(
        cairo.id,
        { fee: 50 + i, etaDays: 2, governorates: ["C", "GZ", "KB"] },
        adminId,
      );
    }
    const page2 = await listActivity(query({ pageSize: "5", page: "2" }));
    expect(page2).toMatchObject({ total: 7, pages: 2, page: 2 });
    expect(page2.items).toHaveLength(2);
  });
});
