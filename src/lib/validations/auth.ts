import { z } from "zod";
import { locales } from "@/i18n/config";

export const loginSchema = z.object({
  email: z.email("validation.emailInvalid"),
  password: z.string().min(1, "validation.passwordRequired"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, "validation.nameShort"),
  email: z.email("validation.emailInvalid"),
  password: z.string().min(8, "validation.passwordShort").regex(/\d/, "validation.passwordDigit"),
  /** language of the page they signed up on: emails and invoices follow it */
  locale: z.enum(locales).optional(),
});

export const forgotSchema = z.object({ email: z.email("validation.emailInvalid") });

export const resetSchema = z.object({
  token: z.string().min(1),
  password: registerSchema.shape.password,
});

export const verifySchema = z.object({ token: z.string().min(1) });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
