import { z } from "zod";
import { EGYPT_MOBILE, GOVERNORATES } from "@/lib/geo";

/** Shipping address as typed in the checkout form and the account page. */
export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "validation.nameShort"),
  phone: z.string().trim().regex(EGYPT_MOBILE, "validation.phoneInvalid"),
  governorate: z.enum(GOVERNORATES, "validation.governorateInvalid"),
  area: z.string().trim().min(2, "validation.areaRequired"),
  street: z.string().trim().min(3, "validation.streetRequired"),
  building: z.string().trim().min(1, "validation.buildingRequired"),
  notes: z.string().trim().max(300).optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const profileSchema = z.object({
  name: z.string().trim().min(2, "validation.nameShort"),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || EGYPT_MOBILE.test(v), "validation.phoneInvalid"),
});
