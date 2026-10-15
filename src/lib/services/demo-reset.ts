import { db } from "@/lib/db";
import { buildSearchText } from "@/lib/i18n/localized";
import { CATEGORIES, PRODUCTS } from "../../../prisma/data/products";
import { ZONES } from "../../../prisma/data/zones";

/**
 * Puts the demo catalog back the way the seed made it: product texts, prices, thresholds, shipping
 * zones and categories. Whatever a visitor with an admin account changed is undone, while the
 * history that other parts depend on stays untouched: orders and their items, stock counts, email
 * logs and the activity feed. Products a visitor added are deleted, or just hidden when an order
 * already points at them. Works in a normal request, so it runs on serverless hosting too.
 */
export async function resetDemo() {
  const result = { categories: 0, products: 0, variants: 0, zones: 0, removed: 0, hidden: 0 };

  await db.$transaction(
    async (tx) => {
      // shipping zones: matched by their English name, the seed's own key
      const zones = await tx.shippingZone.findMany();
      for (const [i, z] of ZONES.entries()) {
        const found = zones.find((x) => (x.name as { en?: string }).en === z.name.en);
        // release the governorates first so two zones never claim the same one mid-way
        if (found)
          await tx.shippingZone.update({ where: { id: found.id }, data: { governorates: [] } });
        const data = { name: z.name, feeCents: z.feeCents, etaDays: z.etaDays, sortOrder: i };
        if (found) await tx.shippingZone.update({ where: { id: found.id }, data });
        else await tx.shippingZone.create({ data: { ...data, governorates: [] } });
      }
      for (const [i, z] of ZONES.entries()) {
        const row = await tx.shippingZone.findFirstOrThrow({
          where: { name: { path: ["en"], equals: z.name.en } },
        });
        await tx.shippingZone.update({
          where: { id: row.id },
          data: { governorates: z.governorates, sortOrder: i },
        });
        result.zones++;
      }

      // categories
      const categoryIds: Record<string, string> = {};
      for (const [i, c] of CATEGORIES.entries()) {
        const row = await tx.category.upsert({
          where: { slug: c.slug },
          update: { name: c.name, sortOrder: i },
          create: { slug: c.slug, name: c.name, sortOrder: i },
        });
        categoryIds[c.slug] = row.id;
        result.categories++;
      }

      // seed products
      for (const p of PRODUCTS) {
        const fields = {
          name: p.name,
          description: p.description,
          searchText: buildSearchText(p.name, p.description, p.origin ?? ""),
          origin: p.origin ?? null,
          roastLevel: p.roast ?? null,
          tastingNotes: p.notes ?? [],
          images: [`/img/${p.slug}`],
          isActive: true,
          categoryId: categoryIds[p.category],
        };
        const product = await tx.product.upsert({
          where: { slug: p.slug },
          update: fields,
          create: { slug: p.slug, ...fields },
          select: { id: true },
        });
        result.products++;
        for (const v of p.variants) {
          const data = {
            name: v.name,
            priceCents: v.price * 100,
            lowStockThreshold: 5,
            isArchived: false,
          };
          await tx.productVariant.upsert({
            where: { sku: v.sku },
            update: { ...data, productId: product.id },
            create: { sku: v.sku, productId: product.id, stock: 50, ...data },
          });
          result.variants++;
        }
        // a variant a visitor added to a seed product is archived (orders may reference it)
        await tx.productVariant.updateMany({
          where: { productId: product.id, sku: { notIn: p.variants.map((v) => v.sku) } },
          data: { isArchived: true },
        });
      }

      // products that are not part of the seed
      const seedSlugs = PRODUCTS.map((p) => p.slug);
      const strangers = await tx.product.findMany({
        where: { slug: { notIn: seedSlugs } },
        select: {
          id: true,
          variants: { select: { id: true, _count: { select: { orderItems: true } } } },
        },
      });
      for (const s of strangers) {
        const sold = s.variants.some((v) => v._count.orderItems > 0);
        if (sold) {
          await tx.product.update({ where: { id: s.id }, data: { isActive: false } });
          result.hidden++;
        } else {
          await tx.product.delete({ where: { id: s.id } });
          result.removed++;
        }
      }
    },
    { timeout: 60_000 },
  );

  return result;
}
