import { z } from "zod";

/**
 * Environment, validated once at start-up so a missing setting stops the app with a clear message
 * instead of failing deep inside a request. Optional services (email, rate limiting, error
 * tracking, image hosting) may be left empty: the app then runs without them.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  // signs the payment callback, so nobody can forge a "paid" notice
  PAYMENT_CALLBACK_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => `  - ${i.message}`).join("\n");
    throw new Error(`Invalid environment:\n${missing}\nSee .env.example`);
  }
  cached = parsed.data;
  return cached;
}

/** The callback secret. A fixed development value is allowed locally, never in production. */
export function paymentCallbackSecret(): string {
  const { PAYMENT_CALLBACK_SECRET, NODE_ENV } = env();
  if (PAYMENT_CALLBACK_SECRET) return PAYMENT_CALLBACK_SECRET;
  if (NODE_ENV === "production")
    throw new Error("PAYMENT_CALLBACK_SECRET is required in production");
  return "dev-only-payment-callback-secret";
}

export const hasGoogleLogin = () => !!env().AUTH_GOOGLE_ID && !!env().AUTH_GOOGLE_SECRET;
export const hasEmailProvider = () => !!env().RESEND_API_KEY;
export const hasRateLimitStore = () =>
  !!env().UPSTASH_REDIS_REST_URL && !!env().UPSTASH_REDIS_REST_TOKEN;
