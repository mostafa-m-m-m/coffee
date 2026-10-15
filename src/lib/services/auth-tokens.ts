import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export type TokenType = "verify" | "reset";

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

/**
 * Makes a one-time token for an emailed link. Only its hash is stored, so a leaked database can't be
 * used to reset anyone's password. Asking again invalidates the earlier link of the same kind.
 */
export async function createToken(userId: string, type: TokenType, ttlHours: number) {
  const raw = randomBytes(32).toString("hex");
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    db.authToken.create({
      data: {
        userId,
        type,
        tokenHash: hash(raw),
        expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
      },
    }),
  ]);
  return raw;
}

/**
 * Spends a token: valid only if it exists, is of this type, is unused and not expired. The claim is a
 * single conditional update, so two clicks (or two requests) can never both succeed.
 */
export async function consumeToken(raw: string, type: TokenType): Promise<string | null> {
  const tokenHash = hash(raw);
  const claimed = await db.authToken.updateMany({
    where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) return null;
  const row = await db.authToken.findUniqueOrThrow({
    where: { tokenHash },
    select: { userId: true },
  });
  return row.userId;
}
