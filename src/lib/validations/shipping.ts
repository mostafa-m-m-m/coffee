import { z } from "zod";
import { GOVERNORATES, isGovernorate } from "@/lib/geo";

/** Fee is entered in pounds (like product prices); stored in qirsh. */
export const shippingZoneSchema = z.object({
  fee: z
    .number("validation.priceRequired")
    .min(0, "validation.feeRange")
    .max(2000, "validation.feeRange"),
  etaDays: z
    .number("validation.integer")
    .int("validation.integer")
    .min(1, "validation.etaRange")
    .max(30, "validation.etaRange"),
  governorates: z
    .array(z.string().refine(isGovernorate, "validation.governorateInvalid"))
    .min(1, "validation.governoratesRequired")
    .max(GOVERNORATES.length),
});
export type ShippingZoneInput = z.infer<typeof shippingZoneSchema>;

export const shippingQuoteSchema = z.object({
  governorate: z.string().refine(isGovernorate, "validation.governorateInvalid"),
  subtotal: z.coerce.number().min(0).max(10_000_000).optional().catch(undefined), // pounds
});
