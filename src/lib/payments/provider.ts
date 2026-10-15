import { createHmac, timingSafeEqual } from "node:crypto";
import type { Locale, PaymentMethod } from "@/generated/prisma/client";
import { paymentCallbackSecret } from "@/lib/env";

/** What a gateway tells us when a card payment ends. Same shape a real gateway's webhook would carry. */
export type CallbackOutcome = "succeeded" | "declined" | "insufficient_funds";
export type CallbackPayload = { ref: string; outcome: CallbackOutcome };

export type PaymentSession = {
  /** Where to send the customer next, or null when there is nothing to pay online. */
  redirectUrl: string | null;
};

/**
 * The seam between the store and a payment gateway. The order flow only talks to this interface:
 * `MockProvider` (the test gateway built into the app) and `CodProvider` implement it, and a real
 * gateway (Paymob...) is a third implementation with no change anywhere else.
 */
export interface PaymentProvider {
  readonly method: PaymentMethod;
  createSession(order: { id: string; paymentRef: string | null; locale: Locale }): PaymentSession;
  verifyCallback(rawBody: string, signature: string | null): CallbackPayload | null;
  /** Returns true when the money went back (nothing to do for cash on delivery). */
  refund(order: { id: string; totalCents: number }): Promise<boolean>;
}

/** HMAC-SHA256 of the exact body, hex. */
export const sign = (rawBody: string, secret = paymentCallbackSecret()) =>
  createHmac("sha256", secret).update(rawBody).digest("hex");

/** Constant-time check, so the comparison itself leaks nothing about the expected signature. */
export function signatureIsValid(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = Buffer.from(sign(rawBody), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const OUTCOMES: readonly CallbackOutcome[] = ["succeeded", "declined", "insufficient_funds"];

export function parseCallback(rawBody: string): CallbackPayload | null {
  try {
    const body = JSON.parse(rawBody) as Partial<CallbackPayload>;
    if (typeof body.ref !== "string" || !body.ref) return null;
    if (!OUTCOMES.includes(body.outcome as CallbackOutcome)) return null;
    return { ref: body.ref, outcome: body.outcome as CallbackOutcome };
  } catch {
    return null;
  }
}
