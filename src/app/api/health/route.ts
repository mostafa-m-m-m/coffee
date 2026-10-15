import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/** GET /api/health — for uptime checks: 200 when the app and its database answer, 503 otherwise. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", database: "up" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
