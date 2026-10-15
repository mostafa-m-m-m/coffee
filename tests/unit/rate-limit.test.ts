import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const k of ["RATE_LIMIT_DISABLED", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"])
    delete process.env[k];
  Object.assign(process.env, env);
  return (await import("@/lib/rate-limit")).rateLimit;
}

describe("rateLimit", () => {
  const saved = { ...process.env };
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    process.env = { ...saved };
  });

  it("counts in memory when no store is configured", async () => {
    const rateLimit = await load({});
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("k1", 3, 60_000));
    expect(results).toEqual([true, true, true, false]);
    expect(await rateLimit("k2", 3, 60_000)).toBe(true); // keys are independent
  });

  it("is switched off for automated runs", async () => {
    const rateLimit = await load({ RATE_LIMIT_DISABLED: "true" });
    for (let i = 0; i < 10; i++) expect(await rateLimit("k", 1, 60_000)).toBe(true);
  });

  it("uses the shared Redis count when Upstash is configured", async () => {
    let count = 0;
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify([{ result: ++count }, { result: 1 }])),
    );
    vi.stubGlobal("fetch", fetchMock);
    const rateLimit = await load({
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "t",
    });
    expect(await rateLimit("k", 2, 60_000)).toBe(true);
    expect(await rateLimit("k", 2, 60_000)).toBe(true);
    expect(await rateLimit("k", 2, 60_000)).toBe(false);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://redis.example/pipeline");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  it("falls back to memory when Upstash is down instead of failing the request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 500 })),
    );
    const rateLimit = await load({
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "t",
    });
    expect(await rateLimit("k", 1, 60_000)).toBe(true);
    expect(await rateLimit("k", 1, 60_000)).toBe(false);
  });
});
