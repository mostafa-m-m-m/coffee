import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { listOrders } from "@/lib/services/admin-orders";
import { orderQuerySchema } from "@/lib/validations/admin-orders";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    return NextResponse.json(await listOrders(orderQuerySchema.parse(params)));
  } catch (e) {
    return errorResponse(e);
  }
}
