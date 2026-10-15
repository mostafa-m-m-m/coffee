import { z } from "zod";
import { locales } from "@/i18n/config";
import { addressSchema } from "@/lib/validations/address";

export const checkoutSchema = z.object({
  locale: z.enum(locales).catch("ar"),
  paymentMethod: z.enum(["CARD", "COD"], "validation.paymentMethodRequired"),
  address: addressSchema,
  items: z
    .array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(99) }))
    .min(1, "validation.cartEmpty")
    .max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
