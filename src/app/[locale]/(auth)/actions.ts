"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getLocale } from "next-intl/server";
import { signIn, signOut } from "@/lib/auth";
import type { ErrorCode } from "@/lib/api-error";
import { rateLimit } from "@/lib/rate-limit";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, type DemoRole } from "@/lib/demo";

export async function loginAction(
  email: string,
  password: string,
  redirectTo: string,
): Promise<{ error: ErrorCode } | undefined> {
  if (!(await rateLimit(`login:${email.toLowerCase()}`))) return { error: "RATE_LIMITED" };
  try {
    await signIn({ email, password, redirectTo });
  } catch (e) {
    if (isRedirectError(e)) throw e; // signed in: send the browser on
    return { error: "INVALID_CREDENTIALS" };
  }
}

/** One click into a demo account. The credentials stay on the server. */
export async function demoLoginAction(
  as: DemoRole,
  locale: string,
): Promise<{ error: ErrorCode } | undefined> {
  const account = DEMO_ACCOUNTS[as];
  if (!account) return { error: "VALIDATION" };
  try {
    await signIn({
      email: account.email,
      password: DEMO_PASSWORD,
      redirectTo: `/${locale}${account.landing}`,
    });
  } catch (e) {
    if (isRedirectError(e)) throw e;
    return { error: "INVALID_CREDENTIALS" };
  }
}

/** Sign out and go back to the storefront in the same language. */
export async function logoutAction() {
  await signOut({ redirectTo: `/${await getLocale()}` });
}
