import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { activityQuerySchema, listActivity } from "@/lib/services/activity";

/** GET /api/admin/activity — admin activity feed (orders, stock, products, shipping), newest first. */
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    return NextResponse.json(await listActivity(activityQuerySchema.parse(params)));
  } catch (e) {
    return errorResponse(e);
  }
}
