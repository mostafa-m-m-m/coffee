import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { newSessionId, SESSION_COOKIE, trackEvent } from "@/lib/services/tracking";
import { ApiError, errorResponse, requireRole } from "@/lib/api";
import { notify } from "@/lib/email/dispatch";
import { sendOrderConfirmed } from "@/lib/email/emails";
import { getPaymentProvider } from "@/lib/payments";
import { createOrder } from "@/lib/services/orders";
import { revalidateStore } from "@/lib/revalidate";
import { checkoutSchema } from "@/lib/validations/checkout";

/**
 * Creates the order. Cash on delivery is confirmed immediately (stock taken); a card order waits
 * on the payment page, which the response points to.
 */
export async function POST(req: Request) {
  try {
    // VIEWER is read-only by design.
    const user = await requireRole("CUSTOMER", "ADMIN");

    const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const i of parsed.error.issues) fields[i.path.join(".")] ??= i.message;
      throw new ApiError(400, "VALIDATION", { fields });
    }
    const { items, address, paymentMethod, locale } = parsed.data;

    const order = await createOrder({
      userId: user.id,
      lines: items,
      address,
      paymentMethod,
      locale,
    });
    const sessionId = (await cookies()).get(SESSION_COOKIE)?.value ?? newSessionId();
    notify(() =>
      trackEvent({ type: "ORDER_PLACED", sessionId, userId: user.id, orderId: order.id }),
    );
    if (paymentMethod === "COD") {
      revalidateStore(); // stock was taken
      notify(() => sendOrderConfirmed(order.id));
    }
    const session = getPaymentProvider(paymentMethod).createSession(order);
    return NextResponse.json({
      orderId: order.id,
      url: session.redirectUrl ?? `/${locale}/checkout/success?order=${order.id}`,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
