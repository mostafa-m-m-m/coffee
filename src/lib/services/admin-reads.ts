import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";

/** The timeline of one order, oldest first, with the name of whoever made each change (null = system). */
export async function getOrderEvents(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) throw new ApiError(404, "NOT_FOUND");
  const events = await db.orderEvent.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
  });
  const ids = [...new Set(events.map((e) => e.actorId).filter((x): x is string => !!x))];
  const users = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
    : [];
  const names = new Map(users.map((u) => [u.id, u.name]));
  return events.map((e) => ({
    id: e.id,
    type: e.type,
    fromStatus: e.fromStatus,
    toStatus: e.toStatus,
    note: e.note,
    createdAt: e.createdAt.toISOString(),
    actor: e.actorId ? { id: e.actorId, name: names.get(e.actorId) ?? null } : null,
  }));
}

/** Every stock movement of one variant, newest first. */
export async function getInventoryLogs(
  variantId: string,
  opts: { page?: number; pageSize?: number } = {},
) {
  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    select: { id: true, sku: true, name: true, stock: true },
  });
  if (!variant) throw new ApiError(404, "NOT_FOUND");
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const [total, rows] = await Promise.all([
    db.inventoryLog.count({ where: { variantId } }),
    db.inventoryLog.findMany({
      where: { variantId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return {
    variant,
    total,
    page,
    pageSize,
    items: rows.map((l) => ({
      id: l.id,
      change: l.change,
      reason: l.reason,
      orderId: l.orderId,
      actorId: l.actorId,
      note: l.note,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

/** The sent-email log, newest first; `html` is left out of the list (open one to preview it). */
export async function listEmails(
  opts: { page?: number; pageSize?: number; type?: string; status?: string } = {},
) {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 1), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const where = {
    ...(opts.type && { type: opts.type }),
    ...(opts.status && { status: opts.status }),
  };
  const [total, rows] = await Promise.all([
    db.emailLog.count({ where }),
    db.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        to: true,
        type: true,
        status: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true } },
      },
    }),
  ]);
  return {
    total,
    page,
    pageSize,
    items: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  };
}

export async function getEmail(id: string) {
  const email = await db.emailLog.findUnique({ where: { id } });
  if (!email) throw new ApiError(404, "NOT_FOUND");
  return { ...email, createdAt: email.createdAt.toISOString() };
}

/** What the payment page shows for one session. Only the customer who placed the order can see it. */
export async function getPaymentSession(userId: string, ref: string) {
  const order = await db.order.findUnique({
    where: { paymentRef: ref },
    select: {
      id: true,
      userId: true,
      orderNumber: true,
      totalCents: true,
      status: true,
      paymentStatus: true,
      paymentExpiresAt: true,
    },
  });
  if (!order || order.userId !== userId) throw new ApiError(404, "NOT_FOUND");
  const now = Date.now();
  const expiresAt = order.paymentExpiresAt;
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountCents: order.totalCents,
    status: order.status,
    paymentStatus: order.paymentStatus,
    expiresAt: expiresAt?.toISOString() ?? null,
    secondsLeft: expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000)) : 0,
    expired: order.status === "CANCELLED" || (!!expiresAt && expiresAt.getTime() < now),
  };
}
