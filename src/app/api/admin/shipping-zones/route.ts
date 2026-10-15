import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { listZones } from "@/lib/services/shipping";

/** GET /api/admin/shipping-zones — zones with fee, delivery time and governorates. */
export async function GET() {
  try {
    await requireRole("ADMIN", "VIEWER");
    return NextResponse.json({ items: await listZones() });
  } catch (e) {
    return errorResponse(e);
  }
}
