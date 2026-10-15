import { reportError } from "@/lib/monitoring";
import { render } from "@react-email/components";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export type EmailType =
  "verify" | "reset" | "order_confirmed" | "shipped" | "apology" | "back_in_stock";
export type EmailStatus = "sent" | "failed" | "logged_only";

/**
 * Renders the email, records it in EmailLog and hands it to Resend. Without RESEND_API_KEY nothing
 * leaves the app: the email is only logged (and can be previewed in the dashboard), which is how the
 * demo and the tests run. A mail problem is reported in the return value and never thrown: a failed
 * email must not undo an order or a sign-up.
 */
export async function sendEmail(input: {
  to: string;
  type: EmailType;
  subject: string;
  react: ReactElement;
  orderId?: string;
}): Promise<EmailStatus> {
  const html = await render(input.react);
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  let status: EmailStatus = "logged_only";

  if (RESEND_API_KEY && EMAIL_FROM) {
    try {
      const { error } = await new Resend(RESEND_API_KEY).emails.send({
        from: EMAIL_FROM,
        to: input.to,
        subject: input.subject,
        html,
      });
      status = error ? "failed" : "sent";
      if (error) reportError(error, "email failed");
    } catch (e) {
      reportError(e, "email failed");
      status = "failed";
    }
  }

  try {
    await db.emailLog.create({
      data: { to: input.to, type: input.type, status, html, orderId: input.orderId ?? null },
    });
  } catch (e) {
    reportError(e, "email log failed");
  }
  return status;
}
