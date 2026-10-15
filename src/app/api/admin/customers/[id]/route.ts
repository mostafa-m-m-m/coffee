import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getCustomerDetail } from "@/lib/services/admin-customers";

/** GET /api/admin/customers/:id — profile, addresses, lifetime spend and recent orders. */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/customers/[id]">) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const { id } = await ctx.params;
    return NextResponse.json(await getCustomerDetail(id));
  } catch (e) {
    return errorResponse(e);
  }
}
