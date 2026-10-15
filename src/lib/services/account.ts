import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import type { AddressInput } from "@/lib/validations/address";

/*
 * Everything a signed-in customer can read or change about themselves. Every query is scoped to
 * `userId` here, in the service, not in the route: asking for someone else's address or order
 * answers 404, exactly as if it did not exist.
 */

export function getProfile(userId: string) {
  return db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      locale: true,
      emailVerified: true,
      role: true,
    },
  });
}

export function updateProfile(userId: string, data: { name: string; phone?: string | null }) {
  return db.user.update({
    where: { id: userId },
    data: { name: data.name, phone: data.phone || null },
    select: { id: true, name: true, email: true, phone: true },
  });
}

export const listAddresses = (userId: string) =>
  db.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { id: "asc" }] });

async function zoneFor(governorate: string) {
  const zone = await db.shippingZone.findFirst({ where: { governorates: { has: governorate } } });
  if (!zone)
    throw new ApiError(400, "VALIDATION", {
      fields: { governorate: "validation.governorateInvalid" },
    });
  return zone;
}

export async function addAddress(userId: string, data: AddressInput) {
  const [count, zone] = await Promise.all([
    db.address.count({ where: { userId } }),
    zoneFor(data.governorate),
  ]);
  return db.address.create({
    data: { ...data, notes: data.notes || null, zoneId: zone.id, userId, isDefault: count === 0 },
  });
}

export async function updateAddress(
  userId: string,
  id: string,
  data: AddressInput & { isDefault?: boolean },
) {
  const zone = await zoneFor(data.governorate);
  const { isDefault, ...fields } = data;
  return db.$transaction(async (tx) => {
    const res = await tx.address.updateMany({
      where: { id, userId },
      data: { ...fields, notes: fields.notes || null, zoneId: zone.id },
    });
    if (res.count === 0) throw new ApiError(404, "NOT_FOUND");
    if (isDefault) {
      await tx.address.updateMany({ where: { userId }, data: { isDefault: false } });
      await tx.address.update({ where: { id }, data: { isDefault: true } });
    }
    return tx.address.findUniqueOrThrow({ where: { id } });
  });
}

/** Deleting the default address promotes the oldest remaining one. */
export async function deleteAddress(userId: string, id: string) {
  await db.$transaction(async (tx) => {
    const gone = await tx.address.findFirst({ where: { id, userId }, select: { isDefault: true } });
    if (!gone) throw new ApiError(404, "NOT_FOUND");
    await tx.address.delete({ where: { id } });
    if (gone.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId },
        orderBy: { id: "asc" },
        select: { id: true },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });
}

export async function listMyOrders(
  userId: string,
  opts: { page?: number; pageSize?: number } = {},
) {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 50);
  const page = Math.max(opts.page ?? 1, 1);
  const where = { userId };
  const [total, rows] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: {
          select: { productName: true, variantName: true, quantity: true, unitPriceCents: true },
        },
      },
    }),
  ]);
  return {
    total,
    page,
    pageSize,
    items: rows.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      totalCents: o.totalCents,
      shippingCents: o.shippingCents,
      vatCents: o.vatCents,
      items: o.items,
    })),
  };
}

/** One of the customer's own orders with its timeline. Anyone else's order is a 404. */
export async function getMyOrder(userId: string, id: string) {
  const order = await db.order.findFirst({
    where: { id, userId },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) throw new ApiError(404, "NOT_FOUND");
  return order;
}
