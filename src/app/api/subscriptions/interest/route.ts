import { subscribeRoute } from "@/lib/subscribe-handler";

/** POST /api/subscriptions/interest { email, locale } */
export const POST = subscribeRoute("subscription-interest");
