import * as Sentry from "@sentry/node";
import { logger } from "@/lib/logger";

let started = false;

/** Starts Sentry once, only when SENTRY_DSN is set. Called from instrumentation.ts. */
export function initMonitoring() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || started) return;
  started = true;
  Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0 });
}

/** Logs an error as structured JSON and, when Sentry is on, reports it there too. Never throws. */
export function reportError(err: unknown, msg: string, context: Record<string, unknown> = {}) {
  logger.error({ err, ...context }, msg);
  if (process.env.SENTRY_DSN) {
    try {
      Sentry.captureException(err, { extra: { msg, ...context } });
    } catch {
      // monitoring must never break the request it is watching
    }
  }
}
