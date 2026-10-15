import { db } from "@/lib/db";
import { expireDueOrders, createOrder } from "@/lib/services/orders";
import { updateOrderStatus } from "@/lib/services/admin-orders";

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

/**
 * One more day of shop activity for the demo: a few new cash-on-delivery orders from existing
 * customers, and the open orders move one step along (confirmed -> shipped -> delivered).
 * Everything goes through the real services, so stock, events and payment status stay consistent.
 */
export async function simulateDay(newOrders = 8) {
  const [customers, variants] = await Promise.all([
    db.user.findMany({
      where: { role: "CUSTOMER", addresses: { some: {} } },
      select: { id: true, locale: true, addresses: { take: 1 } },
      take: 200,
    }),
    db.productVariant.findMany({
      where: { isArchived: false, stock: { gt: 5 }, product: { isActive: true } },
      select: { id: true },
      take: 200,
    }),
  ]);

  let created = 0;
  if (customers.length && variants.length) {
    for (let i = 0; i < newOrders; i++) {
      const c = pick(customers);
      const a = c.addresses[0];
      try {
        await createOrder({
          userId: c.id,
          locale: c.locale,
          paymentMethod: "COD",
          lines: [{ variantId: pick(variants).id, quantity: 1 + Math.floor(Math.random() * 2) }],
          address: {
            fullName: a.fullName,
            phone: a.phone,
            governorate: a.governorate as never,
            area: a.area,
            street: a.street,
            building: a.building,
            notes: a.notes ?? undefined,
          },
        });
        created++;
      } catch {
        // a variant ran out between the read and the order: skip it
      }
    }
  }

  const advance = async (
    from: "SHIPPED" | "CONFIRMED",
    to: "DELIVERED" | "SHIPPED",
    olderThanHours: number,
  ) => {
    const rows = await db.order.findMany({
      where: { status: from, createdAt: { lt: new Date(Date.now() - olderThanHours * 3_600_000) } },
      select: { id: true },
      take: 50,
    });
    let n = 0;
    for (const o of rows) {
      try {
        await updateOrderStatus(o.id, to);
        n++;
      } catch {
        // someone changed it meanwhile
      }
    }
    return n;
  };
  const delivered = await advance("SHIPPED", "DELIVERED", 12);
  const shipped = await advance("CONFIRMED", "SHIPPED", 1);
  return { created, shipped, delivered };
}

export { expireDueOrders };
