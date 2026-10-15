import { z } from "zod";
import { TASTING_NOTES } from "@/lib/tasting-notes";

export const SORTS = ["newest", "best-selling", "price-asc", "price-desc", "name"] as const;
export const ROASTS = ["LIGHT", "MEDIUM", "DARK"] as const;

/**
 * Number from a query string. An empty field (`?max=`, what an untouched form input submits)
 * means "not set"; plain `z.coerce.number()` would turn it into 0 and filter everything out.
 */
export const optionalQueryNumber = z
  .preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0).optional())
  .catch(undefined);

export const productQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((s) => s || undefined)
    .catch(undefined),
  // one or several categories: ?category=a&category=b (or comma separated)
  category: z
    .preprocess(
      (x) => (x == null || x === "" ? undefined : Array.isArray(x) ? x : String(x).split(",")),
      z.array(z.string().trim().min(1).max(100)).max(10).optional(),
    )
    .catch(undefined),
  roast: z.enum(ROASTS).optional().catch(undefined),
  note: z.enum(TASTING_NOTES).optional().catch(undefined),
  min: optionalQueryNumber,
  max: optionalQueryNumber,
  inStock: z.enum(["1"]).optional().catch(undefined),
  sort: z.enum(SORTS).catch("newest"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
