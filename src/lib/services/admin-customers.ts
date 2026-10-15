import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { Prisma } from "@/generated/prisma/client";

export const customerQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .refine((n) => [10, 25, 50, 100].includes(n))
    .catch(25),
  sort: z.enum(["name", "orders", "spent", "last", "joined"]).catch("spent"),
  dir: z.enum(["asc", "desc"]).catch("desc"),
});
export type CustomerQuery = z.infer<typeof customerQuerySchema>;

// column names come from a fixed whitelist, never from user input
const SORT_SQL = {
  name: Prisma.sql`u.name`,
  orders: Prisma.sql`orders`,
  spent: Prisma.sql`spent`,
  last: Prisma.sql`"lastPurchase"`,
  joined: Prisma.sql`u."createdAt"`,
} as const;

/** Customers with lifetime value, computed in one grouped query (revenue statuses only). */
export async function listCustomers(query: CustomerQuery) {
  const search = query.q
    ? Prisma.sql`AND (u.name ILIKE ${`%${query.q}%`} OR u.email ILIKE ${`%${query.q}%`})`
    : Prisma.empty;
  const direction = query.dir === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const offset = (query.page - 1) * query.pageSize;

  const [rows, [{ total }]] = await Promise.all([
    db.$queryRaw<
      {
        id: string;
        name: string;
        email: string;
        joined: Date;
        orders: number;
        spent: number;
        lastPurchase: Date | null;
        governorate: string | null;
      }[]
    >`
      SELECT u.id, u.name, u.email, u."createdAt" AS joined,
             COUNT(o.id) FILTER (WHERE o.status::text IN ('CONFIRMED','SHIPPED','DELIVERED') AND o."paymentStatus"::text <> 'REFUNDED')::int AS orders,
             COALESCE(SUM(o."totalCents") FILTER (WHERE o.status::text IN ('CONFIRMED','SHIPPED','DELIVERED') AND o."paymentStatus"::text <> 'REFUNDED'), 0)::float8 AS spent,
             MAX(o."confirmedAt") FILTER (WHERE o.status::text IN ('CONFIRMED','SHIPPED','DELIVERED') AND o."paymentStatus"::text <> 'REFUNDED') AS "lastPurchase",
             (SELECT a.governorate FROM "Address" a WHERE a."userId" = u.id ORDER BY a."isDefault" DESC, a.id LIMIT 1) AS governorate
      FROM "User" u
      LEFT JOIN "Order" o ON o."userId" = u.id
      WHERE u.role = 'CUSTOMER' ${search}
      GROUP BY u.id
      ORDER BY ${SORT_SQL[query.sort]} ${direction} NULLS LAST, u.id
      LIMIT ${query.pageSize} OFFSET ${offset}
    `,
    db.$queryRaw<{ total: number }[]>`
      SELECT COUNT(*)::int AS total FROM "User" u WHERE u.role = 'CUSTOMER' ${search}
    `,
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      joined: r.joined.toISOString(),
      orders: r.orders,
      spentCents: r.spent,
      lastPurchase: r.lastPurchase?.toISOString() ?? null,
      governorate: r.governorate,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/** One customer for the dashboard side panel: profile, saved addresses, lifetime numbers and recent orders. */
export async function getCustomerDetail(id: string) {
  const user = await db.user.findFirst({
    where: { id, role: "CUSTOMER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      locale: true,
      emailVerified: true,
      createdAt: true,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { id: "asc" }],
        select: {
          id: true,
          governorate: true,
          area: true,
          street: true,
          building: true,
          isDefault: true,
        },
      },
    },
  });
  if (!user) throw new ApiError(404, "NOT_FOUND");
  const [orders, [totals]] = await Promise.all([
    db.order.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalCents: true,
        createdAt: true,
      },
    }),
    db.$queryRaw<{ orders: number; spent: number }[]>`
      SELECT COUNT(*)::int AS orders, COALESCE(SUM("totalCents"), 0)::float8 AS spent
      FROM "Order"
      WHERE "userId" = ${id} AND status::text IN ('CONFIRMED','SHIPPED','DELIVERED') AND "paymentStatus"::text <> 'REFUNDED'
    `,
  ]);
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    orderCount: totals.orders,
    spentCents: totals.spent,
    orders: orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
  };
}
