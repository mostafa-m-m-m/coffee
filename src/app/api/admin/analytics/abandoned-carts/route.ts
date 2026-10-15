import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { ABANDONED_CART_MINUTES } from "@/lib/config";
import { getAbandonedCarts } from "@/lib/services/analytics";
import { rangeFromRequest } from "@/lib/validations/analytics";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    return NextResponse.json({
      ...(await getAbandonedCarts(rangeFromRequest(req), ABANDONED_CART_MINUTES)),
      idleMinutes: ABANDONED_CART_MINUTES,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
