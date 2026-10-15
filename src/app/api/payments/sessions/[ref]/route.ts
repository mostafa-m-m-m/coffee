import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { db } from "@/lib/db";
import { getPaymentSession } from "@/lib/services/admin-reads";
import { expireIfDue } from "@/lib/services/orders";

/** GET /api/payments/sessions/:ref — amount, order number and time left for the payment page. Owner only. */
export async function GET(_req: Request, ctx: RouteContext<"/api/payments/sessions/[ref]">) {
  try {
    const user = await requireUser();
    const { ref } = await ctx.params;
    const order = await db.order.findUnique({
      where: { paymentRef: ref },
      select: { id: true, userId: true },
    });
    if (order && order.userId === user.id) await expireIfDue(order.id); // time is up: cancel before answering
    return NextResponse.json(await getPaymentSession(user.id, ref), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
