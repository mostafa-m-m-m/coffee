import { NextResponse } from "next/server";
import { errorResponse, parseJson, requireRole } from "@/lib/api";
import { adjustInventory } from "@/lib/services/admin-products";
import { afterStockChange } from "@/lib/stock-change";
import { inventoryAdjustSchema } from "@/lib/validations/admin-products";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/inventory/[variantId]">) {
  try {
    const user = await requireRole("ADMIN");
    const { variantId } = await ctx.params;
    const { stock, note } = await parseJson(req, inventoryAdjustSchema);
    const result = await adjustInventory(variantId, stock, note, user.id);
    afterStockChange(result.slug);
    return NextResponse.json({ stock: result.stock, delta: result.delta });
  } catch (e) {
    return errorResponse(e);
  }
}
