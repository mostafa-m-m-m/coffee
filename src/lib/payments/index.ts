import type { PaymentMethod } from "@/generated/prisma/client";
import { notify } from "@/lib/email/dispatch";
import { sendOrderConfirmed, sendOrderUpdate } from "@/lib/email/emails";
import { confirmPayment, failPayment, type PaymentResult } from "@/lib/services/orders";
import {
  parseCallback,
  signatureIsValid,
  type CallbackPayload,
  type PaymentProvider,
} from "./provider";

export const MockProvider: PaymentProvider = {
  method: "CARD",
  createSession: (order) => ({
    redirectUrl: order.paymentRef ? `/${order.locale}/pay/${order.paymentRef}` : null,
  }),
  verifyCallback: (rawBody, signature) =>
    signatureIsValid(rawBody, signature) ? parseCallback(rawBody) : null,
  refund: async () => true, // no money moved in the test gateway: the order status is the record
};

export const CodProvider: PaymentProvider = {
  method: "COD",
  createSession: () => ({ redirectUrl: null }), // pay the courier: nothing to do online
  verifyCallback: () => null, // cash on delivery never receives a gateway callback
  refund: async () => true,
};

export const getPaymentProvider = (method: PaymentMethod): PaymentProvider =>
  method === "COD" ? CodProvider : MockProvider;

export type CallbackResult =
  | { ok: false; reason: "bad_signature" }
  | { ok: true; payload: CallbackPayload; result: PaymentResult | { outcome: "declined" } };

/**
 * One entry point for "the gateway says this payment ended", used by the public callback route
 * and by the built-in test gateway alike, so both take exactly the path a real gateway would.
 * Anything without a valid signature is refused before the database is touched.
 */
export async function handleGatewayCallback(
  rawBody: string,
  signature: string | null,
): Promise<CallbackResult> {
  const payload = MockProvider.verifyCallback(rawBody, signature);
  if (!payload) return { ok: false, reason: "bad_signature" };
  if (payload.outcome === "succeeded") {
    const result = await confirmPayment(payload.ref);
    const { orderId } = result;
    if (orderId && result.outcome === "paid") notify(() => sendOrderConfirmed(orderId));
    if (orderId && result.outcome === "out_of_stock")
      notify(() => sendOrderUpdate(orderId, "apology"));
    return { ok: true, payload, result };
  }
  await failPayment(payload.ref, payload.outcome);
  return { ok: true, payload, result: { outcome: "declined" } };
}
