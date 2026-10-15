import { NextResponse } from "next/server";
import { errorResponse, parseJson, requireRole } from "@/lib/api";
import { createProduct } from "@/lib/services/admin-products";
import { afterStockChange } from "@/lib/stock-change";
import { productSchema } from "@/lib/validations/admin-products";

export async function POST(req: Request) {
  try {
    const user = await requireRole("ADMIN");
    const product = await createProduct(await parseJson(req, productSchema), user.id);
    afterStockChange(product.slug);
    return NextResponse.json({ id: product.id, slug: product.slug }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
