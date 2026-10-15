import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getStatusDistribution } from "@/lib/services/analytics";
import { rangeFromRequest } from "@/lib/validations/analytics";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    return NextResponse.json(await getStatusDistribution(rangeFromRequest(req)));
  } catch (e) {
    return errorResponse(e);
  }
}
