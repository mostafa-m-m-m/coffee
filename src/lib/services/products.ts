import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Locale } from "@/i18n/config";
import { pick } from "@/lib/i18n/localized";
import { productQuerySchema, type ProductQuery } from "@/lib/validations/products";

export const PAGE_SIZE = 12;

/** Below this word-similarity a typo'd search term no longer matches (0..1). */
const SEARCH_SIMILARITY = 0.45;

const listSelect = {
  id: true,
  name: true,
  slug: true,
  images: true,
  createdAt: true,
  origin: true,
  roastLevel: true,
  tastingNotes: true,
  category: { select: { name: true, slug: true } },
  variants: { where: { isArchived: false }, select: { id: true, priceCents: true, stock: true } },
} satisfies Prisma.ProductSelect;

type ListRow = Prisma.ProductGetPayload<{ select: typeof listSelect }>;

function toListItem(p: ListRow, locale: Locale) {
  const prices = p.variants.map((v) => v.priceCents);
  return {
    id: p.id,
    name: pick(p.name, locale),
    slug: p.slug,
    image: p.images[0] ?? null,
    origin: p.origin,
    roastLevel: p.roastLevel,
    tastingNotes: p.tastingNotes,
    category: { name: pick(p.category.name, locale), slug: p.category.slug },
    createdAt: p.createdAt,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    inStock: p.variants.some((v) => v.stock > 0),
    /** set when there is exactly one variant and it is in stock: the card can add it to the cart in one click */
    quickAddVariantId: p.variants.length === 1 && p.variants[0].stock > 0 ? p.variants[0].id : null,
  };
}

/**
 * Ids of products matching a free-text search. It runs on the trigram index over `searchText`
 * (both languages together), so typos still match ("ethopia" finds Ethiopia) in Arabic and English.
 */
async function searchIds(q: string): Promise<string[]> {
  const term = q.toLowerCase();
  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Product"
    WHERE "isActive" = true
      AND ("searchText" LIKE ${`%${term.replace(/[%_\\]/g, "\\$&")}%`}
           OR word_similarity(${term}, "searchText") > ${SEARCH_SIMILARITY})
  `;
  return rows.map((r) => r.id);
}

/**
 * The storefront catalog is small (tens of products), so price sorting/pagination happens in
 * memory after a single filtered query. Admin tables with thousands of rows paginate in SQL.
 */
export async function listProducts(query: ProductQuery, locale: Locale) {
  const ids = query.q ? await searchIds(query.q) : undefined;
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(ids && { id: { in: ids } }),
    ...(query.category?.length && { category: { slug: { in: query.category } } }),
    ...(query.roast && { roastLevel: query.roast }),
    ...(query.note && { tastingNotes: { has: query.note } }),
  };

  const rows = await db.product.findMany({ where, select: listSelect });

  const products = rows
    .map((p) => toListItem(p, locale))
    .filter(
      (p) =>
        (query.min === undefined || p.maxPrice >= query.min * 100) &&
        (query.max === undefined || p.minPrice <= query.max * 100) &&
        (!query.inStock || p.inStock),
    );

  const sold = query.sort === "best-selling" ? await salesBySlug() : null;
  products.sort((a, b) => {
    switch (query.sort) {
      case "best-selling":
        return (
          (sold!.get(b.slug) ?? 0) - (sold!.get(a.slug) ?? 0) ||
          b.createdAt.getTime() - a.createdAt.getTime()
        );
      case "price-asc":
        return a.minPrice - b.minPrice;
      case "price-desc":
        return b.minPrice - a.minPrice;
      case "name":
        return a.name.localeCompare(b.name, locale);
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const suggestion = query.q && products.length ? correctedTerm(query.q, rows) : undefined;
  const total = products.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  return {
    items: products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total,
    page,
    pageCount,
    /** the word we assumed the visitor meant, when their spelling matched nothing exactly */
    suggestion,
  };
}

/** A product with every language kept (the page picks the language; JSON-LD uses both). */
export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: true,
      variants: { where: { isArchived: false }, orderBy: { priceCents: "asc" } },
    },
  });
}

export async function listCategories(locale: Locale) {
  const rows = await db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }] });
  return rows.map((c) => ({ id: c.id, slug: c.slug, name: pick(c.name, locale) }));
}

export async function getFeaturedProducts(locale: Locale, limit = 4) {
  return listProducts(productQuerySchema.parse({}), locale).then((r) => r.items.slice(0, limit));
}

/** Best sellers from real order data (counted orders only). */
export async function getBestSellers(locale: Locale, limit = 4) {
  const rows = await db.$queryRaw<{ slug: string }[]>`
    SELECT p.slug
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "ProductVariant" v ON v.id = oi."variantId"
    JOIN "Product" p ON p.id = v."productId"
    WHERE o.status::text IN ('CONFIRMED','SHIPPED','DELIVERED')
      AND o."paymentStatus"::text <> 'REFUNDED' AND p."isActive" = true
    GROUP BY p.slug
    ORDER BY SUM(oi.quantity) DESC
    LIMIT ${limit}
  `;
  if (!rows.length) return [];
  const all = await db.product.findMany({
    where: { slug: { in: rows.map((r) => r.slug) } },
    select: listSelect,
  });
  return rows
    .map((r) => all.find((p) => p.slug === r.slug))
    .filter((p): p is ListRow => !!p)
    .map((p) => toListItem(p, locale));
}

/** Units sold per product slug (counted orders only): what "best selling" sorts by. */
async function salesBySlug() {
  const rows = await db.$queryRaw<{ slug: string; qty: number }[]>`
    SELECT p.slug, SUM(oi.quantity)::int AS qty
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi."orderId"
    JOIN "ProductVariant" v ON v.id = oi."variantId"
    JOIN "Product" p ON p.id = v."productId"
    WHERE o.status::text IN ('CONFIRMED','SHIPPED','DELIVERED') AND o."paymentStatus"::text <> 'REFUNDED'
    GROUP BY p.slug
  `;
  return new Map(rows.map((r) => [r.slug, r.qty]));
}

const trigrams = (w: string) => {
  const s = `  ${w} `;
  return new Set(Array.from({ length: s.length - 2 }, (_, i) => s.slice(i, i + 3)));
};

/** pg_trgm-style similarity of two words (0..1), for picking the word a typo was aiming at. */
export function wordSimilarity(a: string, b: string) {
  const x = trigrams(a);
  const y = trigrams(b);
  let shared = 0;
  for (const t of x) if (y.has(t)) shared++;
  return shared / (x.size + y.size - shared || 1);
}

/**
 * "ethopia" found "Ethiopia Yirgacheffe": returns "Ethiopia". Only when the typed text is not a
 * literal part of any result, i.e. the match was fuzzy; an ordinary search returns nothing.
 */
function correctedTerm(q: string, rows: { name: unknown; origin: string | null }[]) {
  const term = q.trim().toLowerCase();
  const words = rows.flatMap((r) =>
    [...Object.values((r.name ?? {}) as Record<string, string>), r.origin ?? ""]
      .join(" ")
      .split(/\s+/),
  );
  const clean = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, "")).filter((w) => w.length > 2);
  if (clean.some((w) => w.toLowerCase().includes(term))) return undefined;
  let best: string | undefined;
  let score = 0;
  for (const w of clean) {
    const sim = wordSimilarity(term, w.toLowerCase());
    if (sim > score) [best, score] = [w, sim];
  }
  return score >= 0.3 ? best : undefined;
}

/** Cheapest and dearest price on the shelf (EGP, whole pounds), for the price slider. */
export async function getPriceBounds() {
  const { _min, _max } = await db.productVariant.aggregate({
    where: { isArchived: false, product: { isActive: true } },
    _min: { priceCents: true },
    _max: { priceCents: true },
  });
  return {
    min: Math.floor((_min.priceCents ?? 0) / 100),
    max: Math.ceil((_max.priceCents ?? 0) / 100),
  };
}

/** Up to `limit` other products from the same category, for "You may also like". */
export async function getRelatedProducts(slug: string, locale: Locale, limit = 4) {
  const current = await db.product.findFirst({ where: { slug }, select: { categoryId: true } });
  if (!current) return [];
  const rows = await db.product.findMany({
    where: { isActive: true, categoryId: current.categoryId, slug: { not: slug } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: listSelect,
  });
  return rows.map((p) => toListItem(p, locale));
}
