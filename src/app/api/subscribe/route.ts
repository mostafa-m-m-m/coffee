import { NextResponse } from "next/server";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { subscribe } from "@/lib/services/subscribers";
import { subscribeSchema } from "@/lib/validations/subscribe";

/** POST /api/subscribe — public sign-up for the newsletter or the subscriptions waiting list. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!(await rateLimit(`subscribe:${ip}`, 5, 60_000))) throw new ApiError(429, "RATE_LIMITED");
    await subscribe(await parseJson(req, subscribeSchema));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
