import { env } from "@/lib/env";

/** Public origin used in absolute URLs (sitemap, Open Graph, structured data). No trailing slash. */
export function siteUrl() {
  return (env().NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
