import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { requireCronSecret } from "@/lib/cron";
import { simulateDay } from "@/lib/services/jobs";

/** GET /api/cron/simulate-day — protected by CRON_SECRET (Vercel Cron calls GET). */
export async function GET(req: Request) {
  try {
    requireCronSecret(req);
    const result = await simulateDay();
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return errorResponse(e);
  }
}
