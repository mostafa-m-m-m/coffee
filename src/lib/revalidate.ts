import { revalidatePath } from "next/cache";
import { locales } from "@/i18n/config";

/**
 * Dashboard edits and sales must show up in the storefront immediately, not after the ISR window.
 * Safe to call outside a Next request (unit tests, scripts): there is nothing to revalidate there.
 */
export function revalidateStore(...slugs: (string | undefined)[]) {
  try {
    for (const locale of locales) {
      revalidatePath(`/${locale}`);
      revalidatePath(`/${locale}/products`);
      for (const slug of new Set(slugs)) if (slug) revalidatePath(`/${locale}/products/${slug}`);
    }
  } catch {
    // no Next.js request context
  }
}
