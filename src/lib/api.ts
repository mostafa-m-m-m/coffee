import { reportError } from "@/lib/monitoring";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api-error";

export { ApiError };

/** Parses and validates a JSON body; throws a 400 with per-field messages. */
export async function parseJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (parsed.success) return parsed.data;
  const fields: Record<string, string> = {};
  for (const i of parsed.error.issues) fields[i.path.join(".")] ??= i.message;
  throw new ApiError(400, "VALIDATION", { fields });
}

type Role = "CUSTOMER" | "ADMIN" | "VIEWER";

/** Next uses thrown errors for control flow (static bail-out, redirect, not-found): never swallow those. */
const NEXT_CONTROL =
  /^(NEXT_PRERENDER_INTERRUPTED|HANGING_PROMISE_REJECTION|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING|NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK|NEXT_NOT_FOUND)/;

export function errorResponse(e: unknown) {
  const digest = (e as { digest?: unknown } | null)?.digest;
  if (typeof digest === "string" && NEXT_CONTROL.test(digest)) throw e;
  if (e instanceof ApiError) {
    return NextResponse.json(
      { error: { code: e.code, params: e.params, fields: e.fields } },
      { status: e.status },
    );
  }
  reportError(e, "api error");
  return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
}

/** Layer 2 of 3: every protected API route calls this first. */
export async function requireRole(...roles: Role[]) {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "UNAUTHENTICATED");
  if (!roles.includes(session.user.role)) throw new ApiError(403, "FORBIDDEN");
  return session.user;
}

/** Any signed-in account (customer or staff): for the routes that act on "me". */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "UNAUTHENTICATED");
  return session.user;
}
