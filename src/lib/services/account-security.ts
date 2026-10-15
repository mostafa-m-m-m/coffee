import { ApiError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { sendResetEmail } from "@/lib/email/emails";
import { consumeToken } from "@/lib/services/auth-tokens";
import { hasPassword, setPassword } from "@/lib/services/credentials";

/**
 * "Forgot password": emails a reset link when the address belongs to an account that has a password.
 * The caller answers the same way whether or not it does, so the form can't be used to find out
 * who has an account.
 */
export async function requestPasswordReset(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, name: true, locale: true },
  });
  if (user && (await hasPassword(user.id))) await sendResetEmail(user);
}

/** Sets a new password from an emailed link. Following the link also proves the address is theirs. */
export async function resetPassword(token: string, password: string) {
  const userId = await consumeToken(token, "reset");
  if (!userId) throw new ApiError(400, "INVALID_TOKEN");
  await setPassword(userId, password);
  await db.user.update({ where: { id: userId }, data: { emailVerified: true } });
  // whoever knew the old password is signed out everywhere
  await db.session.deleteMany({ where: { userId } });
  // any other reset link still in somebody's inbox is now useless
  await db.authToken.deleteMany({ where: { userId, type: "reset" } });
}

export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, "verify");
  if (!userId) throw new ApiError(400, "INVALID_TOKEN");
  await db.user.update({ where: { id: userId }, data: { emailVerified: true } });
}
