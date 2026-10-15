import { NextResponse } from "next/server";
import { getProductBySlug } from "@/lib/services/products";
import { ApiError, errorResponse } from "@/lib/api";

export async function GET(_req: Request, ctx: RouteContext<"/api/products/[slug]">) {
  try {
    const { slug } = await ctx.params;
    const product = await getProductBySlug(slug);
    if (!product) throw new ApiError(404, "NOT_FOUND");
    return NextResponse.json(product);
  } catch (e) {
    return errorResponse(e);
  }
}
