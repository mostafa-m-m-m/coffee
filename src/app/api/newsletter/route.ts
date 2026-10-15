import { subscribeRoute } from "@/lib/subscribe-handler";

/** POST /api/newsletter { email, locale } */
export const POST = subscribeRoute("newsletter");
