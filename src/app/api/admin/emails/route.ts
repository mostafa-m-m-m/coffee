import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { listEmails } from "@/lib/services/admin-reads";

/** GET /api/admin/emails?page&pageSize&type&status — the email log. */
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const p = new URL(req.url).searchParams;
    return NextResponse.json(
      await listEmails({
        page: Number(p.get("page")) || 1,
        pageSize: Number(p.get("pageSize")) || 25,
        type: p.get("type") || undefined,
        status: p.get("status") || undefined,
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
