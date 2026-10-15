import { NextResponse } from "next/server";
import { errorResponse, requireRole } from "@/lib/api";
import { getEmail } from "@/lib/services/admin-reads";

/** GET /api/admin/emails/:id — one logged email with its HTML (render it in a sandboxed iframe). */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/emails/[id]">) {
  try {
    await requireRole("ADMIN", "VIEWER");
    const { id } = await ctx.params;
    return NextResponse.json(await getEmail(id));
  } catch (e) {
    return errorResponse(e);
  }
}
