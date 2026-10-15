import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getSalesByCategory } from "@/lib/services/analytics";
import { rangeFromRequest } from "@/lib/validations/analytics";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    return NextResponse.json(await getSalesByCategory(rangeFromRequest(req)));
  } catch (e) {
    return errorResponse(e);
  }
}
