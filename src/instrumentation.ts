import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    (await import("@/lib/monitoring")).initMonitoring();
  }
}

/** Every unhandled error in a route, page or action ends up here: one log line, plus Sentry. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("@/lib/monitoring");
  reportError(err, "request failed", {
    path: request.path,
    method: request.method,
    route: context.routePath,
  });
};
