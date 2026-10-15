import { NextResponse } from "next/server";
import { errorResponse, parseJson, requireRole } from "@/lib/api";
import { notify } from "@/lib/email/dispatch";
import { sendOrderUpdate } from "@/lib/email/emails";
import { updateOrderStatus } from "@/lib/services/admin-orders";
import { afterStockChange } from "@/lib/stock-change";
import { orderStatusUpdateSchema } from "@/lib/validations/admin-orders";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try {
    const user = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const { status } = await parseJson(req, orderStatusUpdateSchema);
    const result = await updateOrderStatus(id, status, user.id);
    afterStockChange(); // cancelling restocks, which the storefront shows
    if (status === "SHIPPED") notify(() => sendOrderUpdate(id, "shipped"));
    return NextResponse.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
