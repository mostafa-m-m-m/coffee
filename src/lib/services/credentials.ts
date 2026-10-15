import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

type Db = Pick<typeof db, "account">;

/** The row Better Auth reads to check an email + password sign-in. */
const credential = (userId: string) => ({ providerId: "credential", accountId: userId });

/** Sets (or replaces) a user's password. The hash is bcrypt, the same as Better Auth is configured to verify. */
export async function setPassword(userId: string, password: string, client: Db = db, rounds = 10) {
  const hash = await bcrypt.hash(password, rounds);
  return client.account.upsert({
    where: { providerId_accountId: credential(userId) },
    update: { password: hash },
    create: { ...credential(userId), userId, password: hash },
  });
}

/** Whether the user can sign in with a password at all (social-only accounts cannot reset one). */
export async function hasPassword(userId: string) {
  const account = await db.account.findUnique({
    where: { providerId_accountId: credential(userId) },
    select: { password: true },
  });
  return !!account?.password;
}

export async function passwordMatches(userId: string, password: string) {
  const account = await db.account.findUnique({
    where: { providerId_accountId: credential(userId) },
    select: { password: true },
  });
  return !!account?.password && bcrypt.compare(password, account.password);
}
