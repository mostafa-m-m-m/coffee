import { notify } from "@/lib/email/dispatch";
import { notifyBackInStock } from "@/lib/services/back-in-stock";
import { revalidateStore } from "@/lib/revalidate";

/**
 * Called by every route that can change what is in stock: refreshes the storefront and, once the
 * response is out, emails anyone who was waiting for something that is available again.
 */
export function afterStockChange(...slugs: (string | undefined)[]) {
  revalidateStore(...slugs);
  notify(notifyBackInStock);
}
