import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { buildSearchText, pick } from "@/lib/i18n/localized";
import { logActivity } from "@/lib/services/activity";
import type { ProductInput } from "@/lib/validations/admin-products";

const cents = (pounds: number) => Math.round(pounds * 100);

async function assertUniqueSlugAndSkus(input: ProductInput, productId?: string) {
  const [slugOwner, skuOwners] = await Promise.all([
    db.product.findUnique({ where: { slug: input.slug }, select: { id: true } }),
    db.productVariant.findMany({
      where: { sku: { in: input.variants.map((v) => v.sku) } },
      select: { id: true, sku: true },
    }),
  ]);
  if (slugOwner && slugOwner.id !== productId) {
    throw new ApiError(409, "SLUG_TAKEN", { fields: { slug: "validation.slugTaken" } });
  }
  const skus = input.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) {
    throw new ApiError(400, "DUPLICATE_SKU");
  }
  const clash = skuOwners.find((o) => !input.variants.some((v) => v.id === o.id));
  if (clash) throw new ApiError(409, "SKU_TAKEN", { params: { sku: clash.sku } });
}

const productFields = (input: ProductInput) => ({
  name: input.name,
  slug: input.slug,
  description: input.description,
  searchText: buildSearchText(input.name, input.description, input.origin ?? ""),
  origin: input.origin || null,
  roastLevel: input.roastLevel ?? null,
  tastingNotes: input.tastingNotes,
  images: input.images,
  isActive: input.isActive,
  categoryId: input.categoryId,
});

export async function createProduct(input: ProductInput, actorId: string | null = null) {
  await assertUniqueSlugAndSkus(input);
  const product = await db.product.create({
    data: {
      ...productFields(input),
      variants: {
        create: input.variants.map((v) => ({
          name: v.name,
          sku: v.sku,
          priceCents: cents(v.price),
          stock: v.stock,
          lowStockThreshold: v.lowStockThreshold,
        })),
      },
    },
    include: { variants: true },
  });
  await logActivity(db, {
    actorId,
    action: "product_created",
    entity: "product",
    entityId: product.id,
    label: pick(input.name, "en") || pick(input.name, "ar"),
    name: input.name,
  });
  // opening stock goes in the history too
  await db.inventoryLog.createMany({
    data: product.variants
      .filter((v) => v.stock > 0)
      .map((v) => ({
        variantId: v.id,
        change: v.stock,
        reason: "RESTOCK" as const,
        actorId,
        note: "Initial stock",
      })),
  });
  return product;
}

/**
 * Updates product fields and variants. Existing variants keep their stock here:
 * stock only changes through `adjustInventory` so every change has a reason in the log.
 * Variants are never deleted (orders reference them): archive them, or hide the product.
 */
export async function updateProduct(
  id: string,
  input: ProductInput,
  actorId: string | null = null,
) {
  const existing = await db.product.findUnique({
    where: { id },
    select: {
      slug: true,
      name: true,
      variants: { select: { id: true, sku: true, priceCents: true } },
    },
  });
  if (!existing) throw new ApiError(404, "NOT_FOUND");
  await assertUniqueSlugAndSkus(input, id);

  const known = new Set(existing.variants.map((v) => v.id));
  if (input.variants.some((v) => v.id && !known.has(v.id))) {
    throw new ApiError(400, "VARIANT_MISMATCH");
  }

  const label = pick(input.name, "en") || pick(input.name, "ar");
  await db.$transaction(async (tx) => {
    await tx.product.update({ where: { id }, data: productFields(input) });
    await logActivity(tx, {
      actorId,
      action: "product_updated",
      entity: "product",
      entityId: id,
      label,
      name: input.name,
    });
    for (const v of input.variants) {
      const before = existing.variants.find((x) => x.id === v.id);
      if (before && before.priceCents !== cents(v.price)) {
        await logActivity(tx, {
          actorId,
          action: "price_changed",
          entity: "product",
          entityId: id,
          label: `${label} · ${v.sku}`,
          name: input.name,
          details: { sku: v.sku, from: before.priceCents, to: cents(v.price) },
        });
      }
    }
    for (const v of input.variants) {
      const common = {
        name: v.name,
        sku: v.sku,
        priceCents: cents(v.price),
        lowStockThreshold: v.lowStockThreshold,
        isArchived: v.isArchived,
      };
      if (v.id) {
        await tx.productVariant.update({ where: { id: v.id }, data: common });
      } else {
        const created = await tx.productVariant.create({
          data: { ...common, stock: v.stock, productId: id },
        });
        if (v.stock > 0) {
          await tx.inventoryLog.create({
            data: {
              variantId: created.id,
              change: v.stock,
              reason: "RESTOCK",
              actorId,
              note: "Initial stock",
            },
          });
        }
      }
    }
  });
  return { previousSlug: existing.slug, slug: input.slug };
}

export async function setProductActive(
  id: string,
  isActive: boolean,
  actorId: string | null = null,
) {
  const product = await db.product
    .update({ where: { id }, data: { isActive }, select: { slug: true, name: true } })
    .catch(() => null);
  if (!product) throw new ApiError(404, "NOT_FOUND");
  await logActivity(db, {
    actorId,
    action: isActive ? "product_restored" : "product_archived",
    entity: "product",
    entityId: id,
    label: pick(product.name, "en") || pick(product.name, "ar"),
    name: product.name,
  });
  return product.slug;
}

/** Manual stock correction, logged with the reason. Atomic against concurrent sales. */
export async function adjustInventory(
  variantId: string,
  newStock: number,
  note: string,
  actorId: string | null = null,
  reason: "MANUAL_ADJUSTMENT" | "RESTOCK" = "MANUAL_ADJUSTMENT",
) {
  return db.$transaction(async (tx) => {
    const current = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true, product: { select: { slug: true } } },
    });
    if (!current) throw new ApiError(404, "NOT_FOUND");
    const delta = newStock - current.stock;

    // `delta` is applied relatively so a sale that lands mid-edit isn't overwritten
    const updated = await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { increment: delta } },
      select: { stock: true },
    });
    if (updated.stock < 0) throw new ApiError(409, "CONFLICT");
    if (delta !== 0) {
      await tx.inventoryLog.create({
        data: {
          variantId,
          change: delta,
          reason,
          actorId,
          note,
        },
      });
    }
    return { stock: updated.stock, delta, slug: current.product.slug };
  });
}
