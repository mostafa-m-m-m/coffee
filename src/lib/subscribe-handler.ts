import { NextResponse } from "next/server";
import { ApiError, errorResponse, parseJson } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { subscribe } from "@/lib/services/subscribers";
import { subscribeSchema, type SubscribeInput } from "@/lib/validations/subscribe";
import { z } from "zod";

/** One sign-up endpoint per list: the route fixes the source, the body carries email, locale (and variantId for back-in-stock). */
export function subscribeRoute(source: SubscribeInput["source"]) {
  const bodySchema = z.object({
    email: z.string(),
    locale: z.string(),
    variantId: z.string().optional(),
  });
  return async function POST(req: Request) {
    try {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
      if (!(await rateLimit(`subscribe:${ip}`, 5, 60_000))) throw new ApiError(429, "RATE_LIMITED");
      const body = await parseJson(req, bodySchema);
      const parsed = subscribeSchema.safeParse({ ...body, source });
      if (!parsed.success) {
        const fields: Record<string, string> = {};
        for (const i of parsed.error.issues) fields[i.path.join(".")] ??= i.message;
        throw new ApiError(400, "VALIDATION", { fields });
      }
      await subscribe(parsed.data);
      return NextResponse.json({ ok: true }, { status: 201 });
    } catch (e) {
      return errorResponse(e);
    }
  };
}
