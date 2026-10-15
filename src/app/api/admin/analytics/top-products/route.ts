import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getTopProducts } from "@/lib/services/analytics";
import { rangeFromRequest } from "@/lib/validations/analytics";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    return NextResponse.json(await getTopProducts(rangeFromRequest(req), 10));
  } catch (e) {
    return errorResponse(e);
  }
}
