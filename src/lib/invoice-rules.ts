/**
 * An invoice exists once an order is a real sale (confirmed, shipped or delivered) and until its money
 * goes back. Shared by the API (which enforces it) and the screens (which only offer the link then).
 */
export const hasInvoice = (o: { status: string; paymentStatus: string }) =>
  ["CONFIRMED", "SHIPPED", "DELIVERED"].includes(o.status) && o.paymentStatus !== "REFUNDED";
