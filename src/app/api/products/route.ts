import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { defaultLocale, isLocale } from "@/i18n/config";
import { listProducts } from "@/lib/services/products";
import { productQuerySchema } from "@/lib/validations/products";

/** GET /api/products?q&category&roast&min&max&inStock&sort&page&locale=en|ar (default ar) */
export async function GET(req: Request) {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams);
    const locale = isLocale(params.locale) ? params.locale : defaultLocale;
    return NextResponse.json(await listProducts(productQuerySchema.parse(params), locale));
  } catch (e) {
    return errorResponse(e);
  }
}
