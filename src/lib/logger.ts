import pino from "pino";

/**
 * One structured JSON line per event (`level`, `time`, `msg`, plus fields), which hosting log
 * collectors index as is. Errors go through `reportError`, which also forwards them to Sentry when
 * a DSN is configured.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
  base: { app: "coffee-store" },
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
});
