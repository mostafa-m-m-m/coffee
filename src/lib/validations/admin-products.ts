import { z } from "zod";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/config";
import { localizedTextSchema } from "@/lib/i18n/localized";

export const variantSchema = z.object({
  id: z.string().optional(), // present for existing variants
  name: localizedTextSchema({ minKey: "validation.variantNameRequired" }),
  sku: z.string().trim().min(2, "validation.skuRequired").max(40),
  price: z.number({ error: "validation.priceRequired" }).min(0.01, "validation.pricePositive"), // EGP
  stock: z
    .number({ error: "validation.stockRequired" })
    .int("validation.integer")
    .min(0, "validation.nonNegative"),
  lowStockThreshold: z
    .number({ error: "validation.thresholdRequired" })
    .int("validation.integer")
    .min(0),
  isArchived: z.boolean(),
});

export const productSchema = z.object({
  name: localizedTextSchema({ min: 2, minKey: "validation.nameShort" }),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "validation.slugFormat"),
  description: localizedTextSchema({ min: 5, minKey: "validation.descriptionRequired" }),
  origin: z.string().trim().max(80).optional(),
  roastLevel: z.enum(["LIGHT", "MEDIUM", "DARK"]).nullable().optional(),
  tastingNotes: z.array(z.string().trim().min(1).max(40)).max(8),
  categoryId: z.string().min(1, "validation.categoryRequired"),
  // absolute URLs, or site-relative paths such as /img/my-product
  images: z
    .array(z.string().regex(/^(https?:\/\/\S+|\/\S+)$/, "validation.urlInvalid"))
    .max(MAX_IMAGES_PER_PRODUCT),
  isActive: z.boolean(),
  variants: z.array(variantSchema).min(1, "validation.variantsMin").max(30),
});

export type ProductInput = z.infer<typeof productSchema>;

export const inventoryAdjustSchema = z.object({
  stock: z.number().int().min(0).max(1_000_000),
  note: z.string().trim().min(3, "validation.reasonRequired").max(200),
});

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
