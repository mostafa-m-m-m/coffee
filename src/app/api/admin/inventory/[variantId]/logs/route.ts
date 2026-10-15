import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getInventoryLogs } from "@/lib/services/admin-reads";

/** GET /api/admin/inventory/:variantId/logs — stock history of one variant. */
export async function GET(
  req: Request,
  ctx: RouteContext<"/api/admin/inventory/[variantId]/logs">,
) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const { variantId } = await ctx.params;
    const p = new URL(req.url).searchParams;
    return NextResponse.json(
      await getInventoryLogs(variantId, {
        page: Number(p.get("page")) || 1,
        pageSize: Number(p.get("pageSize")) || 25,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
