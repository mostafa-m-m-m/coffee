import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, errorResponse, parseJson, requireRole } from "@/lib/api";
import { handleGatewayCallback } from "@/lib/payments";
import { sign, type CallbackOutcome } from "@/lib/payments/provider";
import { revalidateStore } from "@/lib/revalidate";
import { expireIfDue } from "@/lib/services/orders";

// The test cards printed on the payment page. Anything else is not a test card.
const TEST_CARDS: Record<string, CallbackOutcome> = {
  "4242424242424242": "succeeded",
  "4000000000000002": "declined",
  "4000000000009995": "insufficient_funds",
};

const schema = z.object({
  ref: z.string().min(8).max(64),
  number: z.string().transform((s) => s.replace(/\s+/g, "")),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/, "validation.cardExpiryInvalid"),
  cvc: z.string().regex(/^\d{3,4}$/, "validation.cardCvcInvalid"),
  name: z.string().trim().min(2, "validation.nameShort"),
});

/**
 * The built-in test gateway. It decides the outcome from the test card, then reports it through
 * the same signed-callback path a real gateway would use (`handleGatewayCallback`).
 */
export async function POST(req: Request) {
  try {
    const user = await requireRole("CUSTOMER", "ADMIN");
    const input = await parseJson(req, schema);

    const order = await db.order.findUnique({
      where: { paymentRef: input.ref },
      select: { id: true, userId: true },
    });
    // someone else's payment session simply does not exist for you
    if (!order || order.userId !== user.id) throw new ApiError(404, "NOT_FOUND");
    await expireIfDue(order.id);

    const outcome = TEST_CARDS[input.number];
    if (!outcome)
      throw new ApiError(400, "VALIDATION", { fields: { number: "validation.cardNotTest" } });

    const body = JSON.stringify({ ref: input.ref, outcome });
    const res = await handleGatewayCallback(body, sign(body));
    if (!res.ok) throw new ApiError(401, "UNAUTHENTICATED");
    if (res.result.outcome === "paid") revalidateStore();
    return NextResponse.json({ outcome: res.result.outcome, orderId: order.id, reason: outcome });
  } catch (e) {
    return errorResponse(e);
  }
}
