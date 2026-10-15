"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";
import type { TrackInput } from "@/lib/validations/track";

/** Renders nothing; reports one funnel step when the page it sits on is opened. */
export function TrackEvent({ type, productId }: { type: TrackInput["type"]; productId?: string }) {
  useEffect(() => {
    track(type, productId);
  }, [type, productId]);
  return null;
}
