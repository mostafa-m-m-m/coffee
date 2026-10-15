import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { refundOrder } from "@/lib/services/admin-orders";
import { afterStockChange } from "@/lib/stock-change";

/** Refunds a paid order: a cancellation before shipping, a payment-only refund after. */
export async function POST(_req: Request, ctx: RouteContext<"/api/admin/orders/[id]/refund">) {
  try {
    const user = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const result = await refundOrder(id, user.id);
    afterStockChange();
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
