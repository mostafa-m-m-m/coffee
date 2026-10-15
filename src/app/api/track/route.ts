import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import {
  newSessionId,
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  trackEvent,
} from "@/lib/services/tracking";
import { trackSchema } from "@/lib/validations/track";

/** POST /api/track { type, productId? } — one anonymous funnel step (view, add to cart, checkout started). */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!(await rateLimit(`track:${ip}`, 120, 60_000))) throw new ApiError(429, "RATE_LIMITED");
    const input = await parseJson(req, trackSchema);

    const jar = await cookies();
    let sessionId = jar.get(SESSION_COOKIE)?.value;
    if (!sessionId || !/^[0-9a-f]{24}$/.test(sessionId)) {
      sessionId = newSessionId();
      jar.set(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_COOKIE_MAX_AGE,
        path: "/",
      });
    }
    const userId = (await auth())?.user?.id ?? null;
    await trackEvent({ ...input, sessionId, userId });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
