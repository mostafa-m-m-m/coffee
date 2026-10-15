import { subscribeRoute } from "@/lib/subscribe-handler";

/** POST /api/back-in-stock { email, locale, variantId } */
export const POST = subscribeRoute("back-in-stock");
