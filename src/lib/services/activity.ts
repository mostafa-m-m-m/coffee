import { z } from "zod";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { addDaysIso, cairoStartOfDay } from "@/lib/time";

type Db = Pick<typeof db, "activityLog">;

/** Records an admin edit that has no history table of its own (products, prices, shipping zones). */
export function logActivity(
  client: Db,
  e: {
    actorId: string | null;
    action: string;
    entity: string;
    entityId: string;
    /** English-or-Arabic fallback label, kept so the feed survives a deleted entity */
    label: string;
    /** the entity's name in both languages, shown in the viewer's language */
    name?: unknown;
    details?: Record<string, unknown>;
  },
) {
  const { name, details, ...rest } = e;
  const merged = { ...details, ...(name ? { name } : {}) } as Prisma.InputJsonObject;
  return client.activityLog.create({
    data: { ...rest, details: Object.keys(merged).length ? merged : Prisma.JsonNull },
  });
}

export const ACTIVITY_KINDS = ["order", "stock", "product", "shipping"] as const;

export const activityQuerySchema = z.object({
  /** "system" or a user id */
  actor: z.string().max(60).optional().catch(undefined),
  kind: z.enum(ACTIVITY_KINDS).optional().catch(undefined),
  from: z.iso.date().optional().catch(undefined),
  to: z.iso.date().optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(5).max(100).catch(25),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;

export type ActivityEntry = {
  id: string;
  at: string;
  actor: { id: string; name: string } | null; // null = System
  kind: (typeof ACTIVITY_KINDS)[number];
  action: string;
  /** what it happened to: the product name(s), order number or zone name */
  subject: {
    orderId?: string;
    orderNumber?: number;
    product?: unknown;
    variant?: unknown;
    sku?: string;
    label?: string;
    entityId?: string;
  };
  details: Record<string, unknown>;
};

/**
 * One feed from three tables. Order events keep their own history (who moved it, from/to), stock
 * changes come from InventoryLog (manual corrections and restocks only: sales and the initial stock
 * are not admin activity), and ActivityLog holds product and shipping-zone edits.
 */
const FEED = Prisma.sql`
  SELECT e.id, e."createdAt" AS at, e."actorId", 'order'::text AS kind, e.type AS action,
         jsonb_build_object('orderId', e."orderId", 'orderNumber', o."orderNumber") AS subject,
         jsonb_build_object('from', e."fromStatus", 'to', e."toStatus", 'note', e.note) AS details
  FROM "OrderEvent" e JOIN "Order" o ON o.id = e."orderId"
  WHERE e.type <> 'created'
  UNION ALL
  SELECT l.id, l."createdAt", l."actorId", 'stock', l.reason::text,
         jsonb_build_object('product', p.name, 'variant', v.name, 'sku', v.sku),
         jsonb_build_object('change', l.change, 'note', l.note)
  FROM "InventoryLog" l
  JOIN "ProductVariant" v ON v.id = l."variantId" JOIN "Product" p ON p.id = v."productId"
  WHERE l.reason IN ('MANUAL_ADJUSTMENT', 'RESTOCK') AND l."orderId" IS NULL
    AND COALESCE(l.note, '') <> 'Initial stock'
  UNION ALL
  SELECT a.id, a."createdAt", a."actorId",
         CASE a.entity WHEN 'shipping_zone' THEN 'shipping' ELSE 'product' END, a.action,
         jsonb_build_object('label', a.label, 'entityId', a."entityId"),
         COALESCE(a.details, '{}'::jsonb)
  FROM "ActivityLog" a
`;

export async function listActivity(q: ActivityQuery) {
  const where: Prisma.Sql[] = [];
  if (q.actor === "system") where.push(Prisma.sql`f."actorId" IS NULL`);
  else if (q.actor) where.push(Prisma.sql`f."actorId" = ${q.actor}`);
  if (q.kind) where.push(Prisma.sql`f.kind = ${q.kind}`);
  if (q.from) where.push(Prisma.sql`f.at >= ${cairoStartOfDay(q.from)}`);
  if (q.to) where.push(Prisma.sql`f.at < ${cairoStartOfDay(addDaysIso(q.to, 1))}`);
  const clause = where.length ? Prisma.sql`WHERE ${Prisma.join(where, " AND ")}` : Prisma.empty;

  const [[{ total }], rows] = await Promise.all([
    db.$queryRaw<{ total: number }[]>`SELECT COUNT(*)::int AS total FROM (${FEED}) f ${clause}`,
    db.$queryRaw<
      {
        id: string;
        at: Date;
        actorId: string | null;
        kind: ActivityEntry["kind"];
        action: string;
        subject: ActivityEntry["subject"];
        details: Record<string, unknown>;
      }[]
    >`SELECT * FROM (${FEED}) f ${clause} ORDER BY f.at DESC, f.id LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`,
  ]);

  const ids = [...new Set(rows.map((r) => r.actorId).filter((x): x is string => !!x))];
  const users = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const nameOf = new Map(users.map((u) => [u.id, u.name]));

  const items: ActivityEntry[] = rows.map((r) => ({
    id: r.id,
    at: r.at.toISOString(),
    actor: r.actorId ? { id: r.actorId, name: nameOf.get(r.actorId) ?? "—" } : null,
    kind: r.kind,
    action: r.action,
    subject: r.subject,
    details: r.details ?? {},
  }));
  return {
    items,
    total,
    page: q.page,
    pageSize: q.pageSize,
    pages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

/** Staff who appear in the feed, for the actor filter. */
export function listActors() {
  return db.user.findMany({
    where: { role: { in: ["ADMIN", "VIEWER"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
