import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { listCategories } from "@/lib/services/products";
import { isLocale, defaultLocale } from "@/i18n/config";

/** GET /api/categories?locale=en|ar (default ar) */
export async function GET(req: Request) {
  try {
    const l = new URL(req.url).searchParams.get("locale");
    return NextResponse.json(await listCategories(isLocale(l) ? l : defaultLocale));
  } catch (e) {
    return errorResponse(e);
  }
}
