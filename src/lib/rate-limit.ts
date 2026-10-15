import { logger } from "@/lib/logger";
import { env, hasRateLimitStore } from "@/lib/env";

// In-memory sliding window: right for one instance and for local development.
const hits = new Map<string, number[]>();

function memoryLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/**
 * Shared fixed window in Upstash Redis (REST), so every instance counts together. One round trip:
 * INCR the key and, only when it is new, give it its lifetime.
 */
async function upstashLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = env();
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", `rl:${key}`],
      ["PEXPIRE", `rl:${key}`, String(windowMs), "NX"],
    ]),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const [count] = (await res.json()) as { result: number }[];
  return count.result <= limit;
}

/**
 * True when the call is allowed. Uses Upstash when configured and falls back to the in-memory
 * window if it is unreachable, so a Redis outage never takes login or checkout down with it.
 */
export async function rateLimit(key: string, limit = 5, windowMs = 60_000): Promise<boolean> {
  // Only for automated test runs (e2e logs in dozens of times a minute). Never set in production.
  if (process.env.RATE_LIMIT_DISABLED === "true") return true;
  if (hasRateLimitStore()) {
    try {
      return await upstashLimit(key, limit, windowMs);
    } catch (e) {
      logger.warn({ err: e }, "rate limit store unavailable, using memory");
    }
  }
  return memoryLimit(key, limit, windowMs);
}
