import { z } from "zod";
import { GOVERNORATES } from "@/lib/geo";
import { optionalQueryNumber } from "@/lib/validations/products";

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export const PAYMENT_STATUSES = ["UNPAID", "PAID", "FAILED", "REFUNDED"] as const;
export const PAYMENT_METHODS = ["CARD", "COD"] as const;
export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const ORDER_SORT_FIELDS = [
  "orderNumber",
  "createdAt",
  "totalCents",
  "status",
  "paymentStatus",
  "customer",
] as const;

const date = z.iso.date().optional().catch(undefined);
const pounds = optionalQueryNumber; // "" means "not set", never 0

/** A comma-separated query value narrowed to a known list. */
const list = <T extends string>(allowed: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((s) =>
      s ? s.split(",").filter((x): x is T => (allowed as readonly string[]).includes(x)) : [],
    )
    .catch([] as T[]);

/** Shared by the orders table, its API, and the CSV export. */
export const orderFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  from: date,
  to: date,
  status: list(ORDER_STATUSES),
  payment: list(PAYMENT_STATUSES),
  method: list(PAYMENT_METHODS),
  governorate: list(GOVERNORATES),
  minTotal: pounds,
  maxTotal: pounds,
  // drill-down from analytics charts: orders containing a product / a category (by slug)
  category: z.string().max(100).optional().catch(undefined),
  product: z.string().max(100).optional().catch(undefined),
});

export const orderQuerySchema = orderFiltersSchema.extend({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce
    .number()
    .refine((n) => (PAGE_SIZES as readonly number[]).includes(n))
    .catch(25),
  sort: z
    .string()
    .regex(/^[a-zA-Z]+:(asc|desc)$/)
    .refine((s) => (ORDER_SORT_FIELDS as readonly string[]).includes(s.split(":")[0]))
    .catch("createdAt:desc"),
});

export type OrderFilters = z.infer<typeof orderFiltersSchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;

export const orderStatusUpdateSchema = z.object({ status: z.enum(ORDER_STATUSES) });
