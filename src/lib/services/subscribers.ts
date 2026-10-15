import { ApiError } from "@/lib/api-error";
import { db } from "@/lib/db";
import type { SubscribeInput } from "@/lib/validations/subscribe";

/**
 * Newsletter / "tell me when subscriptions launch" / "tell me when this is back" sign-up. Signing up
 * twice is not an error and looks the same to the visitor, so the form can't be used to find out who
 * is on a list.
 */
export async function subscribe({ email, source, locale, variantId }: SubscribeInput) {
  const normalized = email.trim().toLowerCase();
  if (
    variantId &&
    !(await db.productVariant.findUnique({ where: { id: variantId }, select: { id: true } }))
  ) {
    throw new ApiError(404, "NOT_FOUND");
  }
  // the unique index treats a missing variant as "different every time", so check by hand
  const existing = await db.subscriber.findFirst({
    where: { email: normalized, source, variantId: variantId ?? null },
    select: { id: true },
  });
  if (existing) {
    // asking again after having been told once means "tell me again"
    if (variantId)
      await db.subscriber.update({
        where: { id: existing.id },
        data: { notifiedAt: null, locale },
      });
    return;
  }
  await db.subscriber.create({
    data: { email: normalized, source, locale, variantId: variantId ?? null },
  });
}
