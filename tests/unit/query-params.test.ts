import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getPriceBounds, listProducts, wordSimilarity } from "@/lib/services/products";
import { orderFiltersSchema, orderQuerySchema } from "@/lib/validations/admin-orders";
import { productQuerySchema } from "@/lib/validations/products";
import { L, makeProduct, makeUser, rawOrder, resetDb } from "./fixtures";

// What the storefront filter form submits when the user touches nothing but the category.
const FORM_SUBMIT = "q=&category=beans&min=&max=&sort=newest";
const parse = (qs: string) => productQuerySchema.parse(Object.fromEntries(new URLSearchParams(qs)));

describe("query params from HTML forms", () => {
  it("treats empty inputs as 'not set' instead of 0 (regression: empty max hid every product)", () => {
    const q = parse(FORM_SUBMIT);
    expect(q).toMatchObject({ category: ["beans"], min: undefined, max: undefined, q: undefined });
  });

  it("still honours real values, including a legitimate 0 minimum", () => {
    expect(parse("min=0&max=25")).toMatchObject({ min: 0, max: 25 });
    expect(parse("min=-5&max=abc")).toMatchObject({ min: undefined, max: undefined });
  });

  it("applies the same rule to the orders filters", () => {
    const f = orderFiltersSchema.parse({ minTotal: "", maxTotal: "" });
    expect(f.minTotal).toBeUndefined();
    expect(f.maxTotal).toBeUndefined();
    expect(orderQuerySchema.parse({ minTotal: "30", maxTotal: "" })).toMatchObject({
      minTotal: 30,
    });
  });
});

describe("product listing", () => {
  beforeAll(async () => {
    await resetDb();
    for (const [i, price] of [10000, 20000, 30000].entries()) {
      await makeProduct({
        slug: `p${i}`,
        name: L(`P${i}`, `منتج ${i}`),
        variants: [{ sku: `Q${i}`, priceCents: price, stock: i === 2 ? 0 : 5 }],
      });
    }
    await makeProduct({
      slug: "ethiopia-yirgacheffe",
      name: L("Ethiopia Yirgacheffe", "إثيوبيا يرغاتشيفي"),
      description: L("Floral and citrus", "زهري وحمضيات"),
      tastingNotes: ["floral", "citrus"],
      variants: [{ sku: "ETH", priceCents: 36000, stock: 9 }],
    });
    await makeProduct({
      slug: "kenya-aa",
      name: L("Kenya AA", "كينيا AA"),
      description: L("Blackcurrant and citrus", "كشمش أسود وحمضيات"),
      tastingNotes: ["blackcurrant", "citrus"],
      variants: [{ sku: "KEN", priceCents: 40000, stock: 9 }],
    });
  });
  afterAll(() => db.$disconnect());

  it("returns the category's products when min/max are left blank", async () => {
    expect((await listProducts(parse(FORM_SUBMIT), "en")).total).toBe(5);
  });

  it("filters by price range (in EGP) and availability, and sorts", async () => {
    expect((await listProducts(parse("min=150&max=250"), "en")).items.map((p) => p.name)).toEqual([
      "P1",
    ]);
    expect((await listProducts(parse("inStock=1"), "en")).total).toBe(4);
    expect((await listProducts(parse("sort=price-desc"), "en")).items[0].name).toBe("Kenya AA");
  });

  it("filters by tasting note and ignores an unknown one", async () => {
    const names = async (qs: string) =>
      (await listProducts(parse(qs), "en")).items.map((p) => p.name).sort();
    expect(await names("note=citrus")).toEqual(["Ethiopia Yirgacheffe", "Kenya AA"]);
    expect(await names("note=floral")).toEqual(["Ethiopia Yirgacheffe"]);
    expect((await listProducts(parse("note=nonsense"), "en")).total).toBe(5);
  });

  it("takes one or several categories, from repeated or comma-separated params", async () => {
    // the page hands repeated params over as an array (a plain object would keep only the last one)
    expect(productQuerySchema.parse({ category: ["a", "b"] }).category).toEqual(["a", "b"]);
    expect(parse("category=a,b").category).toEqual(["a", "b"]);
    expect(parse("category=").category).toBeUndefined();
    await makeProduct({
      slug: "grinder",
      categorySlug: "gear",
      variants: [{ sku: "G1", priceCents: 90000, stock: 3 }],
    });
    const both = productQuerySchema.parse({ category: ["gear", "beans"] });
    expect((await listProducts(both, "en")).total).toBe(6);
    expect((await listProducts(parse("category=gear"), "en")).items.map((p) => p.name)).toEqual([
      "Product grinder",
    ]);
  });

  it("sorts best selling by units sold in counted orders", async () => {
    const [eth, ken] = await Promise.all([
      db.productVariant.findUniqueOrThrow({ where: { sku: "ETH" } }),
      db.productVariant.findUniqueOrThrow({ where: { sku: "KEN" } }),
    ]);
    const user = await makeUser("buyer@t.test");
    const sell = async (variantId: string, quantity: number, status: "CONFIRMED" | "CANCELLED") => {
      const o = await rawOrder(user.id, { cents: 1000, status });
      await db.orderItem.create({
        data: {
          orderId: o.id,
          variantId,
          productName: { en: "x", ar: "x" },
          variantName: { en: "x", ar: "x" },
          unitPriceCents: 1000,
          quantity,
        },
      });
    };
    await sell(eth.id, 2, "CONFIRMED");
    await sell(ken.id, 9, "CANCELLED"); // cancelled orders do not count
    await sell(ken.id, 1, "CONFIRMED");
    const names = (await listProducts(parse("sort=best-selling"), "en")).items.map((p) => p.name);
    expect(names.slice(0, 2)).toEqual(["Ethiopia Yirgacheffe", "Kenya AA"]);
  });

  it("says which word a typo was matched to, but only for a fuzzy match", async () => {
    expect((await listProducts(parse("q=ethopia"), "en")).suggestion).toBe("Ethiopia");
    expect((await listProducts(parse("q=ethiopia"), "en")).suggestion).toBeUndefined();
    expect((await listProducts(parse(""), "en")).suggestion).toBeUndefined();
    expect(wordSimilarity("ethopia", "ethiopia")).toBeGreaterThan(
      wordSimilarity("ethopia", "kenya"),
    );
  });

  it("knows the cheapest and dearest price for the slider", async () => {
    const b = await getPriceBounds();
    expect(b.min).toBeLessThanOrEqual(150);
    expect(b.max).toBeGreaterThanOrEqual(400);
  });

  it("shows names in the visitor's language", async () => {
    const en = await listProducts(parse("category=beans&sort=name"), "en");
    const ar = await listProducts(parse("category=beans&sort=name"), "ar");
    expect(en.items.some((p) => p.name === "Kenya AA")).toBe(true);
    expect(ar.items.some((p) => p.name === "كينيا AA")).toBe(true);
    expect(ar.items.every((p) => !/^P\d$/.test(p.name))).toBe(true);
  });

  it("search forgives typos, in English and in Arabic, and searches both languages at once", async () => {
    const slugs = async (q: string, locale: "en" | "ar" = "en") =>
      (await listProducts(parse(`q=${encodeURIComponent(q)}`), locale)).items.map((p) => p.slug);

    expect(await slugs("ethopia")).toEqual(["ethiopia-yirgacheffe"]); // missing "i"
    expect(await slugs("kenia")).toEqual(["kenya-aa"]);
    expect(await slugs("اثيوبيا", "ar")).toEqual(["ethiopia-yirgacheffe"]); // no hamza
    expect(await slugs("كينيا", "ar")).toEqual(["kenya-aa"]);
    expect(await slugs("Ethiopia", "ar")).toEqual(["ethiopia-yirgacheffe"]); // English term, Arabic page
    expect((await slugs("حمضيات")).sort()).toEqual(["ethiopia-yirgacheffe", "kenya-aa"]);
    expect(await slugs("zzzzzz")).toEqual([]);
  });

  it("treats LIKE wildcards in a search as plain text", async () => {
    expect((await listProducts(parse("q=%25"), "en")).total).toBe(0);
  });
});
