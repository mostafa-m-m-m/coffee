import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getTimeseriesWithComparison } from "@/lib/services/analytics";
import { rangeFromRequest } from "@/lib/validations/analytics";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const r = rangeFromRequest(req);
    return NextResponse.json({
      granularity: r.granularity,
      points: await getTimeseriesWithComparison(r, r.previous, r.granularity),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
