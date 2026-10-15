import { NextResponse } from "next/server";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { resetPassword } from "@/lib/services/account-security";
import { resetSchema } from "@/lib/validations/auth";

/** POST /api/auth/reset { token, password } */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!(await rateLimit(`reset:${ip}`, 10, 10 * 60_000))) throw new ApiError(429, "RATE_LIMITED");
    const { token, password } = await parseJson(req, resetSchema);
    await resetPassword(token, password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
