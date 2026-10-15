import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { STORE_TIME_ZONE } from "@/lib/config";
import { addDaysIso } from "@/lib/time";

/**
 * What counts as a sale (business rules, "Analytics definitions"):
 * an order that is CONFIRMED, SHIPPED or DELIVERED and not refunded, dated by `confirmedAt`
 * (the moment it became real), never `createdAt`. PENDING and CANCELLED orders are excluded.
 */
const COUNTED = `status::text IN ('CONFIRMED','SHIPPED','DELIVERED') AND "paymentStatus"::text <> 'REFUNDED' AND "confirmedAt" IS NOT NULL`;
const COUNTED_O = COUNTED.replaceAll("status", "o.status")
  .replaceAll('"paymentStatus"', 'o."paymentStatus"')
  .replaceAll('"confirmedAt"', 'o."confirmedAt"');

// Constant SQL text defined in this file (never user input); every value goes in as a bound parameter.
const COUNTED_SQL = Prisma.raw(COUNTED);
const COUNTED_O_SQL = Prisma.raw(COUNTED_O);
const TZ_SQL = Prisma.raw(`'${STORE_TIME_ZONE}'`);

export type Range = { from: Date; to: Date }; // from inclusive, to exclusive (Cairo-day boundaries)
export type Granularity = "day" | "week" | "month";

export function previousRange({ from, to }: Range): Range {
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span), to: from };
}

// The WHERE fragments are constants above, not user input; every value is a bound parameter.
async function totals({ from, to }: Range) {
  const [row] = await db.$queryRaw<
    { sales: number; orders: number; collected: number }[]
  >(Prisma.sql`SELECT COALESCE(SUM("totalCents"), 0)::float8 AS sales,
            COUNT(*)::int AS orders,
            COALESCE(SUM("totalCents") FILTER (WHERE "paymentStatus"::text = 'PAID'), 0)::float8 AS collected
     FROM "Order"
     WHERE ${COUNTED_SQL} AND "confirmedAt" >= ${from} AND "confirmedAt" < ${to}`);
  // a "new customer" is a user whose first counted order falls inside the period
  const [fresh] = await db.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS n FROM (
       SELECT "userId", MIN("confirmedAt") AS first_at
       FROM "Order" WHERE ${COUNTED_SQL} GROUP BY "userId"
     ) t WHERE first_at >= ${from} AND first_at < ${to}`);
  return {
    salesCents: row.sales,
    collectedCents: row.collected,
    orders: row.orders,
    aovCents: row.orders ? Math.round(row.sales / row.orders) : 0,
    newCustomers: fresh.n,
  };
}

/** KPIs for a period plus the same KPIs for the period right before it. */
export async function getSummary(range: Range, previous: Range = previousRange(range)) {
  const [cur, prev] = await Promise.all([totals(range), totals(previous)]);
  return { current: cur, previous: prev };
}

export const pctChange = (current: number, previous: number) =>
  previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / previous) * 100;

/** Cash on delivery money not yet collected: confirmed or shipped COD orders still UNPAID. */
export async function getCodOutstanding() {
  const [row] = await db.$queryRaw<{ total: number; orders: number }[]>`
    SELECT COALESCE(SUM("totalCents"), 0)::float8 AS total, COUNT(*)::int AS orders
    FROM "Order"
    WHERE "paymentMethod" = 'COD' AND "paymentStatus" = 'UNPAID' AND status::text IN ('CONFIRMED','SHIPPED')
  `;
  return { totalCents: row.total, orders: row.orders };
}

/** Bucket start as a Cairo calendar date, grouped in the database. */
async function bucketRows(
  { from, to }: Range,
  granularity: Granularity,
): Promise<{ bucket: string; sales: number; orders: number }[]> {
  return db.$queryRaw(Prisma.sql`SELECT to_char(date_trunc(${granularity}, ("confirmedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ_SQL}), 'YYYY-MM-DD') AS bucket,
            SUM("totalCents")::float8 AS sales,
            COUNT(*)::int AS orders
     FROM "Order"
     WHERE ${COUNTED_SQL} AND "confirmedAt" >= ${from} AND "confirmedAt" < ${to}
     GROUP BY 1
     ORDER BY 1`);
}

export async function getTimeseries(
  range: Range,
  granularity: Granularity,
  fromDate: string,
  toDate: string,
) {
  const rows = await bucketRows(range, granularity);
  // fill empty buckets with zeros so the line doesn't skip days with no sales
  const byKey = new Map(rows.map((r) => [r.bucket, r]));
  const out: { date: string; salesCents: number; orders: number }[] = [];
  let cursor = fromDate;
  if (granularity === "week") {
    const dow = (new Date(`${cursor}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday = 0
    cursor = addDaysIso(cursor, -dow);
  }
  if (granularity === "month") cursor = `${cursor.slice(0, 8)}01`;
  while (cursor <= toDate) {
    const r = byKey.get(cursor);
    out.push({ date: cursor, salesCents: r?.sales ?? 0, orders: r?.orders ?? 0 });
    if (granularity === "day") cursor = addDaysIso(cursor, 1);
    else if (granularity === "week") cursor = addDaysIso(cursor, 7);
    else {
      const d = new Date(`${cursor}T00:00:00Z`);
      cursor = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
        .toISOString()
        .slice(0, 10);
    }
  }
  return out;
}

/** Calendar days of a range, as inclusive Cairo dates (the range's `to` is exclusive). */
export type DayRange = Range & { fromDate: string; toDate: string };

/** Current period plus the previous one, bucket-aligned so the chart can overlay them by index. */
export async function getTimeseriesWithComparison(
  range: DayRange,
  previous: DayRange,
  granularity: Granularity,
) {
  const [current, prev] = await Promise.all([
    getTimeseries(range, granularity, range.fromDate, range.toDate),
    getTimeseries(previous, granularity, previous.fromDate, previous.toDate),
  ]);
  return current.map((c, i) => ({
    ...c,
    previousDate: prev[i]?.date ?? null,
    previousSalesCents: prev[i]?.salesCents ?? null,
  }));
}

export function getSalesByCategory({ from, to }: Range) {
  return db.$queryRaw<
    { slug: string; name: unknown; salesCents: number; units: number }[]
  >(Prisma.sql`SELECT c.slug, c.name,
            SUM(oi."unitPriceCents" * oi.quantity)::float8 AS "salesCents",
            SUM(oi.quantity)::int AS units
     FROM "OrderItem" oi
     JOIN "Order" o ON o.id = oi."orderId"
     JOIN "ProductVariant" v ON v.id = oi."variantId"
     JOIN "Product" p ON p.id = v."productId"
     JOIN "Category" c ON c.id = p."categoryId"
     WHERE ${COUNTED_O_SQL} AND o."confirmedAt" >= ${from} AND o."confirmedAt" < ${to}
     GROUP BY c.slug, c.name
     ORDER BY 3 DESC`);
}

export function getTopProducts({ from, to }: Range, limit = 10) {
  return db.$queryRaw<
    { slug: string; name: unknown; salesCents: number; units: number }[]
  >(Prisma.sql`SELECT p.slug, p.name,
            SUM(oi."unitPriceCents" * oi.quantity)::float8 AS "salesCents",
            SUM(oi.quantity)::int AS units
     FROM "OrderItem" oi
     JOIN "Order" o ON o.id = oi."orderId"
     JOIN "ProductVariant" v ON v.id = oi."variantId"
     JOIN "Product" p ON p.id = v."productId"
     WHERE ${COUNTED_O_SQL} AND o."confirmedAt" >= ${from} AND o."confirmedAt" < ${to}
     GROUP BY p.slug, p.name
     ORDER BY 4 DESC, 3 DESC
     LIMIT ${limit}`);
}

export const ALL_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

/** Orders per status per week (every status, not just sales) for the stacked bar chart. */
export async function getStatusDistribution({ from, to }: Range) {
  const rows = await db.$queryRaw<{ week: string; status: string; count: number }[]>`
    SELECT to_char(date_trunc('week', (COALESCE("confirmedAt", "createdAt") AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Cairo'), 'YYYY-MM-DD') AS week,
           status::text AS status, COUNT(*)::int AS count
    FROM "Order"
    WHERE COALESCE("confirmedAt", "createdAt") >= ${from} AND COALESCE("confirmedAt", "createdAt") < ${to}
    GROUP BY 1, 2
    ORDER BY 1
  `;
  const weeks = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const entry = weeks.get(r.week) ?? Object.fromEntries(ALL_STATUSES.map((s) => [s, 0]));
    entry[r.status] = r.count;
    weeks.set(r.week, entry);
  }
  return [...weeks].map(
    ([week, counts]) => ({ week, ...counts }) as { week: string } & Record<string, number>,
  );
}

export function getLowStock(limit = 8) {
  return db.$queryRaw<
    {
      id: string;
      sku: string;
      variant: unknown;
      product: unknown;
      stock: number;
      threshold: number;
    }[]
  >`
    SELECT v.id, v.sku, v.name AS variant, p.name AS product, v.stock, v."lowStockThreshold" AS threshold
    FROM "ProductVariant" v
    JOIN "Product" p ON p.id = v."productId"
    WHERE p."isActive" = true AND v."isArchived" = false AND v.stock <= v."lowStockThreshold"
    ORDER BY v.stock ASC, p."searchText"
    LIMIT ${limit}
  `;
}

export const FUNNEL_STAGES = [
  "PRODUCT_VIEW",
  "ADD_TO_CART",
  "CHECKOUT_START",
  "ORDER_PLACED",
] as const;

/**
 * The shopping funnel: how many distinct visits reached each step in the period. Counted by visit
 * (the anonymous session), so one person adding five things to the cart counts once.
 */
export async function getFunnel({ from, to }: Range) {
  const rows = await db.$queryRaw<{ type: string; sessions: number }[]>`
    SELECT type::text AS type, COUNT(DISTINCT "sessionId")::int AS sessions
    FROM "AnalyticsEvent"
    WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
    GROUP BY type
  `;
  const by = new Map(rows.map((r) => [r.type, r.sessions]));
  return FUNNEL_STAGES.map((stage) => ({ stage, sessions: by.get(stage) ?? 0 }));
}

/**
 * Carts that still hold items and were left alone for a while: shoppers who didn't come back. Ordering
 * empties the cart, so what is left is, by definition, not bought.
 */
export async function getAbandonedCarts({ from, to }: Range, idleMinutes: number) {
  const idleBefore = new Date(Date.now() - idleMinutes * 60_000);
  const [row] = await db.$queryRaw<{ carts: number; valueCents: number }[]>`
    SELECT COUNT(*)::int AS carts, COALESCE(SUM(t.value), 0)::float8 AS "valueCents"
    FROM (
      SELECT c.id, SUM(ci.quantity * v."priceCents") AS value
      FROM "Cart" c
      JOIN "CartItem" ci ON ci."cartId" = c.id
      JOIN "ProductVariant" v ON v.id = ci."variantId"
      WHERE c."updatedAt" >= ${from} AND c."updatedAt" < ${to} AND c."updatedAt" < ${idleBefore}
      GROUP BY c.id
    ) t
  `;
  return { carts: row.carts, valueCents: row.valueCents };
}

/** Sales by the governorate the order was shipped to (counted orders only). */
export function getSalesByGovernorate({ from, to }: Range) {
  return db.$queryRaw<
    { governorate: string; orders: number; salesCents: number }[]
  >(Prisma.sql`SELECT COALESCE("shippingAddress"->>'governorate', '') AS governorate,
            COUNT(*)::int AS orders,
            SUM("totalCents")::float8 AS "salesCents"
     FROM "Order"
     WHERE ${COUNTED_SQL} AND "confirmedAt" >= ${from} AND "confirmedAt" < ${to}
     GROUP BY 1
     ORDER BY 3 DESC`);
}

/** Card versus cash on delivery (counted orders only). */
export function getPaymentSplit({ from, to }: Range) {
  return db.$queryRaw<
    { method: string; orders: number; salesCents: number }[]
  >(Prisma.sql`SELECT "paymentMethod"::text AS method, COUNT(*)::int AS orders, SUM("totalCents")::float8 AS "salesCents"
     FROM "Order"
     WHERE ${COUNTED_SQL} AND "confirmedAt" >= ${from} AND "confirmedAt" < ${to}
     GROUP BY 1
     ORDER BY 3 DESC`);
}

/**
 * New customers per Cairo day (a customer is "new" on the day of their first counted order),
 * zero-filled to match `getTimeseries(..., "day")`. Feeds the overview sparkline.
 */
export async function getNewCustomersSeries({ from, to }: Range, fromDate: string, toDate: string) {
  const rows = await db.$queryRaw<
    { bucket: string; n: number }[]
  >(Prisma.sql`SELECT to_char(date_trunc('day', (first_at AT TIME ZONE 'UTC') AT TIME ZONE ${TZ_SQL}), 'YYYY-MM-DD') AS bucket,
            COUNT(*)::int AS n
     FROM (
       SELECT "userId", MIN("confirmedAt") AS first_at
       FROM "Order" WHERE ${COUNTED_SQL} GROUP BY "userId"
     ) t
     WHERE first_at >= ${from} AND first_at < ${to}
     GROUP BY 1`);
  const byDay = new Map(rows.map((r) => [r.bucket, r.n]));
  const out: number[] = [];
  for (let d = fromDate; d <= toDate; d = addDaysIso(d, 1)) out.push(byDay.get(d) ?? 0);
  return out;
}
