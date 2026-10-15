import { z } from "zod";
import { locales } from "@/i18n/config";

/** Which list a sign-up joins. "back-in-stock" is per variant: the email is sent when that item returns. */
export const SUBSCRIBE_SOURCES = ["newsletter", "subscription-interest", "back-in-stock"] as const;

export const subscribeSchema = z
  .object({
    email: z.email("validation.emailInvalid"),
    source: z.enum(SUBSCRIBE_SOURCES),
    locale: z.enum(locales),
    variantId: z.string().min(1).max(40).optional(),
  })
  // a back-in-stock request needs the variant, and the other lists must not carry one
  .refine((v) => (v.source === "back-in-stock") === !!v.variantId, {
    message: "validation.variantRequired",
    path: ["variantId"],
  });

export type SubscribeInput = z.infer<typeof subscribeSchema>;

/** Just the email field, which is all the sign-up form itself validates. */
export const emailOnlySchema = z.object({ email: z.email("validation.emailInvalid") });
