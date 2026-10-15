import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getOrderEvents } from "@/lib/services/admin-reads";

/** GET /api/admin/orders/:id/events — everything that happened to the order, and who did it. */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/orders/[id]/events">) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const { id } = await ctx.params;
    return NextResponse.json({ items: await getOrderEvents(id) });
  } catch (e) {
    return errorResponse(e);
  }
}
