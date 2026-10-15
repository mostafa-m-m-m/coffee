import { FREE_SHIPPING_THRESHOLD_CENTS, VAT_RATE } from "@/lib/config";

/** The VAT already contained in a VAT-inclusive amount (rounded to the qirsh). */
export const vatIncluded = (inclusiveCents: number) =>
  Math.round((inclusiveCents * VAT_RATE) / (1 + VAT_RATE));

export const qualifiesForFreeShipping = (subtotalCents: number) =>
  subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;

/** Shipping for a zone: free above the threshold, otherwise the zone's fee. Empty cart ships nothing. */
export const shippingFor = (subtotalCents: number, zoneFeeCents: number) =>
  subtotalCents === 0 || qualifiesForFreeShipping(subtotalCents) ? 0 : zoneFeeCents;

/** Everything an order stores, computed once on the server from database prices. */
export function computeTotals(subtotalCents: number, zoneFeeCents: number) {
  const shippingCents = shippingFor(subtotalCents, zoneFeeCents);
  const totalCents = subtotalCents + shippingCents;
  return { subtotalCents, shippingCents, totalCents, vatCents: vatIncluded(totalCents) };
}

/** Qirsh needed to reach free shipping (0 once reached). */
export const remainingForFreeShipping = (subtotalCents: number) =>
  Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
