import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getSummary } from "@/lib/services/analytics";
import { rangeFromRequest } from "@/lib/validations/analytics";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const r = rangeFromRequest(req);
    const summary = await getSummary(r, r.previous);
    // the range is returned as the inclusive Cairo dates the UI shows
    return NextResponse.json({
      ...summary,
      range: { from: r.fromDate, to: r.toDate },
      previousRange: { from: r.previous.fromDate, to: r.previous.toDate },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
