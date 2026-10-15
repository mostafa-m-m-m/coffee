import Papa from "papaparse";
import { db } from "@/lib/db";
import { buildOrderWhere } from "@/lib/services/admin-orders";
import type { OrderFilters } from "@/lib/validations/admin-orders";

const BATCH = 2000;
const HEADER = [
  "Order #",
  "Confirmed at (UTC)",
  "Status",
  "Payment status",
  "Payment method",
  "Governorate",
  "Customer",
  "Email",
  "Items",
  "Subtotal (EGP)",
  "Shipping (EGP)",
  "VAT included (EGP)",
  "Total (EGP)",
];
const pounds = (cents: number) => (cents / 100).toFixed(2);

/**
 * Streams orders matching the filters as CSV. Rows are fetched in keyset-paginated batches
 * (never OFFSET), and each batch is pushed to the client before the next is read, so memory
 * stays flat whether it's 500 rows or 500,000.
 */
export function ordersCsvStream(filters: OrderFilters): ReadableStream<Uint8Array> {
  const where = buildOrderWhere(filters);
  const encoder = new TextEncoder();
  let cursor: string | undefined;
  let first = true;

  return new ReadableStream({
    async pull(controller) {
      try {
        const rows = await db.order.findMany({
          where,
          orderBy: { id: "asc" },
          take: BATCH,
          ...(cursor && { cursor: { id: cursor }, skip: 1 }),
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            confirmedAt: true,
            status: true,
            paymentStatus: true,
            paymentMethod: true,
            shippingAddress: true,
            subtotalCents: true,
            shippingCents: true,
            vatCents: true,
            totalCents: true,
            user: { select: { name: true, email: true } },
            _count: { select: { items: true } },
          },
        });

        let chunk = first ? "﻿" + Papa.unparse([HEADER], { newline: "\r\n" }) + "\r\n" : ""; // BOM so Excel reads UTF-8
        first = false;
        if (rows.length) {
          chunk +=
            Papa.unparse(
              rows.map((o) => [
                o.orderNumber,
                (o.confirmedAt ?? o.createdAt).toISOString(),
                o.status,
                o.paymentStatus,
                o.paymentMethod,
                ((o.shippingAddress ?? {}) as { governorate?: string }).governorate ?? "",
                o.user.name,
                o.user.email,
                o._count.items,
                pounds(o.subtotalCents),
                pounds(o.shippingCents),
                pounds(o.vatCents),
                pounds(o.totalCents),
              ]),
              { newline: "\r\n" },
            ) + "\r\n";
        }
        if (chunk) controller.enqueue(encoder.encode(chunk));

        if (rows.length < BATCH) controller.close();
        else cursor = rows[rows.length - 1].id;
      } catch (e) {
        controller.error(e);
      }
    },
  });
}
