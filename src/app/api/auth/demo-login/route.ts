import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { authServer } from "@/lib/auth";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { locales } from "@/i18n/config";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  as: z.enum(["customer", "viewer"]),
  locale: z.enum(locales).default("ar"),
});

/** POST /api/auth/demo-login { as: "customer" | "viewer", locale? } — one-click sign-in to a demo account. */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!(await rateLimit(`demo:${ip}`, 20, 60_000))) throw new ApiError(429, "RATE_LIMITED");
    const { as, locale } = await parseJson(req, schema);
    const account = DEMO_ACCOUNTS[as];
    await authServer.api.signInEmail({
      body: { email: account.email, password: DEMO_PASSWORD },
      headers: req.headers,
    });
    return NextResponse.json({ redirectTo: `/${locale}${account.landing}` });
  } catch (e) {
    return errorResponse(e);
  }
}
