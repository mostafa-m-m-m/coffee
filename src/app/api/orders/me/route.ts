import { NextResponse } from "next/server";
import { errorResponse, requireUser } from "@/lib/api";
import { listMyOrders } from "@/lib/services/account";

/** GET /api/orders/me?page&pageSize — the signed-in customer's orders, newest first. */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const p = new URL(req.url).searchParams;
    return NextResponse.json(
      await listMyOrders(user.id, {
        page: Number(p.get("page")) || 1,
        pageSize: Number(p.get("pageSize")) || 20,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
