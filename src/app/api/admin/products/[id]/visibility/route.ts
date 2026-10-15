import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, parseJson, requireRole } from "@/lib/api";
import { setProductActive } from "@/lib/services/admin-products";
import { afterStockChange } from "@/lib/stock-change";

const schema = z.object({ isActive: z.boolean() });

/** PATCH /api/admin/products/:id/visibility { isActive } — show or hide a product in the store. */
export async function PATCH(
  req: Request,
  ctx: RouteContext<"/api/admin/products/[id]/visibility">,
) {
  try {
    const user = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const { isActive } = await parseJson(req, schema);
    afterStockChange(await setProductActive(id, isActive, user.id));
    return NextResponse.json({ id, isActive });
  } catch (e) {
    return errorResponse(e);
  }
}
