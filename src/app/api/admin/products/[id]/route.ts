import { NextResponse } from "next/server";
import { errorResponse, parseJson, requireRole } from "@/lib/api";
import { setProductActive, updateProduct } from "@/lib/services/admin-products";
import { afterStockChange } from "@/lib/stock-change";
import { productSchema } from "@/lib/validations/admin-products";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  try {
    const user = await requireRole("ADMIN");
    const { id } = await ctx.params;
    const { previousSlug, slug } = await updateProduct(
      id,
      await parseJson(req, productSchema),
      user.id,
    );
    afterStockChange(previousSlug, slug);
    return NextResponse.json({ id, slug });
  } catch (e) {
    return errorResponse(e);
  }
}

/** Soft delete: the product is hidden from the store but kept for order history. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  try {
    const user = await requireRole("ADMIN");
    const { id } = await ctx.params;
    afterStockChange(await setProductActive(id, false, user.id));
    return NextResponse.json({ id, isActive: false });
  } catch (e) {
    return errorResponse(e);
  }
}
