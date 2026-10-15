import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api";
import { requireCronSecret } from "@/lib/cron";
import { revalidateStore } from "@/lib/revalidate";
import { resetDemo } from "@/lib/services/demo-reset";

async function run(req: Request) {
  try {
    requireCronSecret(req);
    const result = await resetDemo();
    revalidateStore();
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return errorResponse(e);
  }
}

/** GET /api/cron/reset-demo — weekly Vercel Cron: restore the seeded catalog and shipping zones (Bearer CRON_SECRET). */
export const GET = run;
/** POST works too, for running it by hand from a terminal. */
export const POST = run;
