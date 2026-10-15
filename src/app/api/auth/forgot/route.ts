import { NextResponse } from "next/server";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/services/account-security";
import { forgotSchema } from "@/lib/validations/auth";

/** POST /api/auth/forgot — always answers 202, whether or not the email has an account. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!(await rateLimit(`forgot:${ip}`, 5, 10 * 60_000))) throw new ApiError(429, "RATE_LIMITED");
    const { email } = await parseJson(req, forgotSchema);
    await requestPasswordReset(email);
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
