import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { requireCronSecret } from "@/lib/cron";
import { expireDueOrders } from "@/lib/services/jobs";

/** GET /api/cron/expire-payments — protected by CRON_SECRET (Vercel Cron calls GET). */
export async function GET(req: Request) {
  try {
    requireCronSecret(req);
    const result = await expireDueOrders();
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return errorResponse(e);
  }
}
