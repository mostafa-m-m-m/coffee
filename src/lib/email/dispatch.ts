import { reportError } from "@/lib/monitoring";
import { after } from "next/server";

/**
 * Runs `task` once the response has gone out, so a slow mail server never slows a checkout down.
 * Outside a web request (jobs, tests) it just runs in the background. Failures are logged, never thrown.
 */
export function notify(task: () => Promise<unknown>) {
  const run = () => task().catch((e) => reportError(e, "notification failed"));
  try {
    after(run);
  } catch {
    void run();
  }
}
