import { NextResponse } from "next/server";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { verifyEmail } from "@/lib/services/account-security";
import { verifySchema } from "@/lib/validations/auth";

/** POST /api/auth/verify { token } — the confirmation page calls this, so a mail scanner opening the link can't spend it. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!(await rateLimit(`verify:${ip}`, 10, 10 * 60_000)))
      throw new ApiError(429, "RATE_LIMITED");
    const { token } = await parseJson(req, verifySchema);
    await verifyEmail(token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
