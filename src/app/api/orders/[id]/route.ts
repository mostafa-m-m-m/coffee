import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { getMyOrder } from "@/lib/services/account";

/** GET /api/orders/:id — one of your own orders with its timeline. Someone else's order is a 404. */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;
    return NextResponse.json(await getMyOrder(user.id, id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
