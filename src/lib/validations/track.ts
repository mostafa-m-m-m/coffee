import { z } from "zod";

/** Events the browser reports. Placing an order is recorded by the server itself, not by the page. */
export const CLIENT_EVENTS = ["PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_START"] as const;

export const trackSchema = z.object({
  type: z.enum(CLIENT_EVENTS),
  productId: z.string().min(1).max(40).optional(),
});

export type TrackInput = z.infer<typeof trackSchema>;
