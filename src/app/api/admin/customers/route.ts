import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { customerQuerySchema, listCustomers } from "@/lib/services/admin-customers";

export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const params = Object.fromEntries(new URL(req.url).searchParams);
    return NextResponse.json(await listCustomers(customerQuerySchema.parse(params)));
  } catch (e) {
    return errorResponse(e);
  }
}
