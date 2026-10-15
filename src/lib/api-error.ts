export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INTERNAL",
  "RATE_LIMITED",
  "EMAIL_TAKEN",
  "SLUG_TAKEN",
  "SKU_TAKEN",
  "DUPLICATE_SKU",
  "VARIANT_MISMATCH",
  "EMPTY_CART",
  "ITEM_UNAVAILABLE",
  "INSUFFICIENT_STOCK",
  "INVALID_TRANSITION",
  "PAYMENTS_UNAVAILABLE",
  "INVALID_CREDENTIALS",
  "NOT_REFUNDABLE",
  "INVALID_TOKEN",
  "UPLOADS_UNAVAILABLE",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export type ErrorParams = Record<string, string | number>;

/**
 * Errors carry a machine code + params, never prose: the client translates them with the
 * `Errors.api.<code>` messages in the user's locale. `fields` maps a form path to a
 * `Errors.validation.<key>` message key (see lib/validations).
 */
export class ApiError extends Error {
  readonly params?: ErrorParams;
  readonly fields?: Record<string, string>;

  constructor(
    public status: number,
    public code: ErrorCode,
    opts: { params?: ErrorParams; fields?: Record<string, string> } = {},
  ) {
    super(code);
    this.params = opts.params;
    this.fields = opts.fields;
  }
}

/** Wire format of every non-2xx API response. */
export type ApiErrorBody = {
  error: { code: ErrorCode; params?: ErrorParams; fields?: Record<string, string> };
};
