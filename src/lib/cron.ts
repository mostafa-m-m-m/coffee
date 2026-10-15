import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { ApiError } from "@/lib/api-error";

/**
 * Guards /api/cron/*. Vercel Cron (or any caller) sends `Authorization: Bearer <CRON_SECRET>`.
 * With no CRON_SECRET configured the jobs are closed, never open.
 */
export function requireCronSecret(req: Request) {
  const secret = env().CRON_SECRET;
  if (!secret) throw new ApiError(401, "UNAUTHENTICATED");
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    throw new ApiError(401, "UNAUTHENTICATED");
  }
}
