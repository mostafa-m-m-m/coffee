import { reportError } from "@/lib/monitoring";
import { randomBytes } from "node:crypto";
import type { EventType } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/** Name of the cookie holding the anonymous visit id. It says nothing about who the visitor is. */
export const SESSION_COOKIE = "ember_sid";
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const newSessionId = () => randomBytes(12).toString("hex");

/**
 * One step of the shopping funnel. `sessionId` is the anonymous visit id from the cookie, `userId`
 * is set only when the visitor happens to be signed in. Never throws: tracking must not break a page.
 */
export async function trackEvent(e: {
  type: EventType;
  sessionId: string;
  userId?: string | null;
  productId?: string | null;
  orderId?: string | null;
}) {
  try {
    await db.analyticsEvent.create({
      data: {
        type: e.type,
        sessionId: e.sessionId,
        userId: e.userId ?? null,
        productId: e.productId ?? null,
        orderId: e.orderId ?? null,
      },
    });
  } catch (err) {
    reportError(err, "tracking failed");
  }
}
