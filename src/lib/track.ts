import type { TrackInput } from "@/lib/validations/track";

/**
 * Reports one funnel step from the browser. Fire and forget: it never throws, never waits, and does
 * nothing when the visitor has "Do Not Track" switched on.
 */
export function track(type: TrackInput["type"], productId?: string) {
  if (typeof navigator === "undefined" || navigator.doNotTrack === "1") return;
  void fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, productId }),
    keepalive: true,
  }).catch(() => {});
}
