import bcrypt from "bcryptjs";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_DAYS } from "@/lib/config";

export type Role = "CUSTOMER" | "ADMIN" | "VIEWER";
export type SessionUser = { id: string; role: Role; name: string; email: string };

/**
 * Better Auth, backed by our Prisma tables (User, Session, Account). Sign-up is not open on its
 * own endpoint: accounts are created by /api/auth/register, which also sends the verification
 * email in the customer's language. Passwords stay bcrypt hashes, so every account that existed
 * before the move keeps working.
 */
export const authServer = betterAuth({
  secret: process.env.AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  trustedOrigins: ["http://localhost:3000", "http://localhost:3100", "http://localhost:3200"],
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    autoSignIn: false,
    password: {
      hash: (password) => bcrypt.hash(password, 10),
      verify: ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "CUSTOMER", input: false },
      locale: { type: "string", defaultValue: "ar", input: false },
      phone: { type: "string", required: false, input: false },
    },
  },
  // optional: the "Continue with Google" button only appears when both keys are set
  socialProviders:
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? {
          google: {
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          },
        }
      : {},
  session: { expiresIn: 60 * 60 * 24 * SESSION_DAYS, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_DISABLED !== "true",
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 60, max: 5 } },
  },
  plugins: [nextCookies()],
});

/**
 * The signed-in user of this request, or null. Same shape the rest of the app has always used
 * (`session.user.id / role / name / email`), so pages and routes did not change with the library.
 */
export async function auth(): Promise<{ user: SessionUser } | null> {
  const found = await authServer.api.getSession({ headers: await headers() });
  if (!found) return null;
  const u = found.user as typeof found.user & { role?: string };
  return { user: { id: u.id, role: (u.role as Role) ?? "CUSTOMER", name: u.name, email: u.email } };
}

/** Signs in with email + password and sends the browser to `redirectTo`. Throws when the credentials are wrong. */
export async function signIn(opts: { email: string; password: string; redirectTo: string }) {
  await authServer.api.signInEmail({
    body: { email: opts.email.toLowerCase(), password: opts.password },
    headers: await headers(),
  });
  redirect(opts.redirectTo);
}

export async function signOut(opts: { redirectTo: string }) {
  await authServer.api.signOut({ headers: await headers() });
  redirect(opts.redirectTo);
}
