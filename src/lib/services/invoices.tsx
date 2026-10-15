import { renderToBuffer } from "@react-pdf/renderer";
import type { Locale } from "@/i18n/config";
import { ApiError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { hasInvoice } from "@/lib/invoice-rules";
import { registerPdfFonts } from "@/lib/pdf/fonts";
import { InvoiceDocument, type InvoiceData } from "@/lib/pdf/invoice";

/**
 * An invoice exists once an order is real (confirmed, shipped or delivered) and until its money is
 * returned. Pending, cancelled and refunded orders have none. `viewerId` limits it to the owner;
 * staff pass null.
 */
export async function buildInvoice(orderId: string, viewerId: string | null, lang?: Locale) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true, user: { select: { name: true, email: true } } },
  });
  // somebody else's order simply doesn't exist for you
  if (!order || (viewerId && order.userId !== viewerId)) throw new ApiError(404, "NOT_FOUND");
  if (!hasInvoice(order) || !order.confirmedAt) throw new ApiError(404, "NOT_FOUND");

  const data: InvoiceData = {
    orderNumber: order.orderNumber,
    confirmedAt: order.confirmedAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    vatCents: order.vatCents,
    totalCents: order.totalCents,
    customerName: order.user.name,
    customerEmail: order.user.email,
    address: order.shippingAddress as InvoiceData["address"],
    items: order.items.map((i) => ({
      productName: i.productName as InvoiceData["items"][number]["productName"],
      variantName: i.variantName as InvoiceData["items"][number]["variantName"],
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
    })),
  };
  registerPdfFonts();
  const locale = lang ?? order.locale;
  const pdf = await renderToBuffer(<InvoiceDocument data={data} locale={locale} />);
  return { pdf, orderNumber: order.orderNumber };
}
