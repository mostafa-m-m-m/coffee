import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { STORE_TIME_ZONE } from "@/lib/config";
import { formatsFor } from "./formats";
import { messages } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: messages[locale],
    formats: formatsFor(locale),
    timeZone: STORE_TIME_ZONE,
  };
});
