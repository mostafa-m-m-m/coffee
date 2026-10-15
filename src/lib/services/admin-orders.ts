import { db } from "@/lib/db";
import type { OrderStatus as Status, Prisma } from "@/generated/prisma/client";
import { ApiError, type ErrorCode, type ErrorParams } from "@/lib/api-error";
import type { OrderFilters, OrderQuery } from "@/lib/validations/admin-orders";
import { recordEvent, restoreStock } from "@/lib/services/orders";

export function buildOrderWhere(f: OrderFilters): Prisma.OrderWhereInput {
  const and: Prisma.OrderWhereInput[] = [];

  if (f.q) {
    const asNumber = /^#?\d+$/.test(f.q) ? Number(f.q.replace("#", "")) : null;
    and.push({
      OR: [
        ...(asNumber !== null && asNumber < 2_147_483_647 ? [{ orderNumber: asNumber }] : []),
        { user: { name: { contains: f.q, mode: "insensitive" } } },
        { user: { email: { contains: f.q, mode: "insensitive" } } },
      ],
    });
  }
  if (f.from || f.to) {
    and.push({
      createdAt: {
        ...(f.from && { gte: new Date(`${f.from}T00:00:00.000Z`) }),
        // `to` is inclusive for the user, so filter < the next day
        ...(f.to && { lt: new Date(new Date(`${f.to}T00:00:00.000Z`).getTime() + 86_400_000) }),
      },
    });
  }
  if (f.status.length) and.push({ status: { in: f.status } });
  if (f.payment.length) and.push({ paymentStatus: { in: f.payment } });
  if (f.method.length) and.push({ paymentMethod: { in: f.method } });
  if (f.governorate.length) {
    and.push({
      OR: f.governorate.map((g) => ({ shippingAddress: { path: ["governorate"], equals: g } })),
    });
  }
  if (f.minTotal !== undefined || f.maxTotal !== undefined) {
    and.push({
      totalCents: {
        ...(f.minTotal !== undefined && { gte: Math.round(f.minTotal * 100) }),
        ...(f.maxTotal !== undefined && { lte: Math.round(f.maxTotal * 100) }),
      },
    });
  }
  if (f.category) {
    and.push({ items: { some: { variant: { product: { category: { slug: f.category } } } } } });
  }
  if (f.product) and.push({ items: { some: { variant: { product: { slug: f.product } } } } });
  return and.length ? { AND: and } : {};
}

export function buildOrderBy(sort: string): Prisma.OrderOrderByWithRelationInput[] {
  const [field, dir] = sort.split(":") as [string, "asc" | "desc"];
  const primary: Prisma.OrderOrderByWithRelationInput =
    field === "customer" ? { user: { name: dir } } : { [field]: dir };
  // stable tiebreaker so pages never overlap or skip rows
  return [primary, { id: "asc" }];
}

export async function listOrders(query: OrderQuery) {
  const where = buildOrderWhere(query);
  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: buildOrderBy(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalCents: true,
        shippingAddress: true,
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);
  return {
    items: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      governorate: ((o.shippingAddress ?? {}) as { governorate?: string }).governorate ?? null,
      totalCents: o.totalCents,
      customerName: o.user.name,
      customerEmail: o.user.email,
      itemCount: o._count.items,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

/**
 * Which manual transitions an admin may make. Status never goes backwards, cancelling is only
 * possible before shipping (afterwards the answer is a refund), and CONFIRMED is only reachable
 * through payment (card) or checkout (cash on delivery).
 */
export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  PENDING: ["CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Changes an order's status. Every change is one transaction that also writes the OrderEvent
 * (who, when) and, when stock was already taken, puts it back.
 *  - CONFIRMED -> CANCELLED: stock returns; a paid order is refunded.
 *  - SHIPPED -> DELIVERED: a cash-on-delivery order is now PAID (the money was collected).
 */
export async function updateOrderStatus(
  orderId: string,
  next: Status,
  actorId: string | null = null,
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentStatus: true, paymentMethod: true },
    });
    if (!order) throw new ApiError(404, "NOT_FOUND");
    if (!ALLOWED_TRANSITIONS[order.status].includes(next)) {
      throw new ApiError(409, "INVALID_TRANSITION", { params: { from: order.status, to: next } });
    }

    const paymentStatus =
      next === "CANCELLED" && order.paymentStatus === "PAID"
        ? "REFUNDED"
        : next === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "UNPAID"
          ? "PAID"
          : order.paymentStatus;

    // conditional on the status we just read, so two admins can't both apply a transition
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: next, paymentStatus },
    });
    if (res.count === 0) throw new ApiError(409, "CONFLICT");

    await recordEvent(tx, orderId, {
      type: "status_changed",
      fromStatus: order.status,
      toStatus: next,
      actorId,
    });
    if (paymentStatus !== order.paymentStatus) {
      await recordEvent(tx, orderId, {
        type: paymentStatus === "REFUNDED" ? "refunded" : "payment_succeeded",
        actorId,
        note: paymentStatus === "PAID" ? "cod_collected" : undefined,
      });
    }
    if (order.status === "CONFIRMED" && next === "CANCELLED")
      await restoreStock(tx, orderId, actorId);
    return { id: orderId, status: next, paymentStatus };
  });
}

/**
 * Refund a paid order. Before shipping it is a cancellation (stock returns). After shipping the
 * order keeps its status and only the payment becomes REFUNDED; the goods are not back on the shelf.
 */
export async function refundOrder(orderId: string, actorId: string | null = null) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentStatus: true },
    });
    if (!order) throw new ApiError(404, "NOT_FOUND");
    if (
      order.paymentStatus !== "PAID" ||
      order.status === "CANCELLED" ||
      order.status === "PENDING"
    ) {
      throw new ApiError(409, "NOT_REFUNDABLE");
    }
    const cancel = order.status === "CONFIRMED";
    const res = await tx.order.updateMany({
      where: { id: orderId, status: order.status, paymentStatus: "PAID" },
      data: { paymentStatus: "REFUNDED", ...(cancel && { status: "CANCELLED" as const }) },
    });
    if (res.count === 0) throw new ApiError(409, "CONFLICT");
    await recordEvent(tx, orderId, {
      type: "refunded",
      fromStatus: order.status,
      toStatus: cancel ? "CANCELLED" : order.status,
      actorId,
    });
    if (cancel) await restoreStock(tx, orderId, actorId);
    return {
      id: orderId,
      status: cancel ? "CANCELLED" : order.status,
      paymentStatus: "REFUNDED" as const,
    };
  });
}

/** Bulk status change. Returns which orders changed and which were skipped (with the error code). */
export async function bulkUpdateOrderStatus(
  ids: string[],
  next: Status,
  actorId: string | null = null,
) {
  const changed: string[] = [];
  const skipped: { id: string; code: ErrorCode; params?: ErrorParams }[] = [];
  for (const id of ids) {
    try {
      await updateOrderStatus(id, next, actorId);
      changed.push(id);
    } catch (e) {
      if (e instanceof ApiError) skipped.push({ id, code: e.code, params: e.params });
      else throw e;
    }
  }
  return { changed, skipped };
}
