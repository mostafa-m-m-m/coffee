import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { resetDemo } from "@/lib/services/demo-reset";
import { PRODUCTS } from "../../prisma/data/products";
import { ZONES } from "../../prisma/data/zones";
import { L, makeProduct, makeUser, rawOrder, resetDb } from "./fixtures";

afterAll(() => db.$disconnect());

describe("reset-demo", () => {
  beforeAll(async () => {
    await resetDb();
  });

  it("builds the seeded catalog and zones on an empty database", async () => {
    const out = await resetDemo();
    expect(out).toMatchObject({
      products: PRODUCTS.length,
      zones: ZONES.length,
      removed: 0,
      hidden: 0,
    });
    expect(await db.product.count()).toBe(PRODUCTS.length);
    expect(await db.shippingZone.count()).toBe(ZONES.length);
    const gov = (await db.shippingZone.findMany()).flatMap((z) => z.governorates);
    expect(new Set(gov).size).toBe(27); // every governorate in exactly one zone
  });

  it("undoes edits, removes visitor products, hides sold ones and leaves stock and orders alone", async () => {
    const seed = PRODUCTS[0];
    const product = await db.product.findUniqueOrThrow({
      where: { slug: seed.slug },
      include: { variants: true },
    });
    const variant = product.variants[0];

    // a visitor with an admin account makes a mess
    await db.productVariant.update({
      where: { id: variant.id },
      data: { priceCents: 1, stock: 7, isArchived: true },
    });
    await db.product.update({
      where: { id: product.id },
      data: { name: L("Hacked", "مخترق"), isActive: false },
    });
    const zone = await db.shippingZone.findFirstOrThrow({
      where: { name: { path: ["en"], equals: ZONES[0].name.en } },
    });
    await db.shippingZone.update({
      where: { id: zone.id },
      data: { feeCents: 99900, etaDays: 30 },
    });
    const gone = await makeProduct({
      slug: "visitor-product",
      variants: [{ sku: "VIS-1", priceCents: 100, stock: 1 }],
    });
    const sold = await makeProduct({
      slug: "visitor-sold",
      variants: [{ sku: "VIS-2", priceCents: 100, stock: 1 }],
    });
    const buyer = await makeUser("buyer@t.test");
    const order = await rawOrder(buyer.id, { cents: 100, status: "DELIVERED" });
    await db.orderItem.create({
      data: {
        orderId: order.id,
        variantId: sold.variants[0].id,
        productName: { en: "x", ar: "x" },
        variantName: { en: "x", ar: "x" },
        unitPriceCents: 100,
        quantity: 1,
      },
    });

    const out = await resetDemo();
    expect(out).toMatchObject({ removed: 1, hidden: 1 });

    const after = await db.product.findUniqueOrThrow({
      where: { id: product.id },
      include: { variants: true },
    });
    expect(after.name).toEqual(seed.name);
    expect(after.isActive).toBe(true);
    const v = after.variants.find((x) => x.id === variant.id)!;
    expect(v.priceCents).toBe(seed.variants[0].price * 100);
    expect(v.isArchived).toBe(false);
    expect(v.stock).toBe(7); // stock is history of real sales, not an edit to undo

    const z = await db.shippingZone.findUniqueOrThrow({ where: { id: zone.id } });
    expect(z).toMatchObject({ feeCents: ZONES[0].feeCents, etaDays: ZONES[0].etaDays });

    expect(await db.product.findUnique({ where: { id: gone.id } })).toBeNull();
    expect((await db.product.findUniqueOrThrow({ where: { id: sold.id } })).isActive).toBe(false);
    expect(await db.order.count()).toBe(1);
    expect(await db.orderItem.count()).toBe(1);
  });

  it("is safe to run twice", async () => {
    const a = await resetDemo();
    const b = await resetDemo();
    expect(b).toMatchObject({ products: a.products, removed: 0 });
    expect(await db.product.count({ where: { slug: { in: PRODUCTS.map((p) => p.slug) } } })).toBe(
      PRODUCTS.length,
    );
  });
});
