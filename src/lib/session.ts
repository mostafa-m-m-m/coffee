import { cache } from "react";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

/**
 * `auth()` for Server Components. Declaring the request-time dependency first (`connection()`)
 * keeps Auth.js's random CSRF token generation out of the prerender pass, which Cache Components
 * would otherwise flag on every page. Route handlers and actions can call `auth()` directly.
 * Wrapped in `cache` so several components in one request share a single session lookup.
 */
export const getSession = cache(async () => {
  await connection();
  return auth();
});
