/** Business constants. Money is in qirsh (1 EGP = 100). Everything that touches price reads from here. */

export const CURRENCY = "EGP";

/** Orders whose subtotal reaches this ship free (1,000 EGP). */
export const FREE_SHIPPING_THRESHOLD_CENTS = 100_000;

/** Egypt's VAT. Shelf prices already include it. */
export const VAT_RATE = 0.14;

/** How long a sign-in lasts without activity being renewed. */
export const SESSION_DAYS = 30;

/** How long a card payment session stays open. */
export const PAYMENT_SESSION_MINUTES = 30;

/** Every date in reports and on screen is the Cairo calendar day. */
export const STORE_TIME_ZONE = "Africa/Cairo";

/** Largest export the dashboard will produce. */
export const MAX_EXPORT_ROWS = 50_000;

/** Image upload limits (Cloudinary signed uploads). */
export const MAX_IMAGES_PER_PRODUCT = 5;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Shown in the storefront copy ("roasted within N days"). */
export const ROAST_FRESH_DAYS = 7;

/** How long the one-time links in emails stay valid. */
export const RESET_TOKEN_HOURS = 1;
export const VERIFY_TOKEN_HOURS = 24;

/** A cart nobody has touched for this long counts as abandoned in the dashboard. */
export const ABANDONED_CART_MINUTES = 60;
