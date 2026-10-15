import { createFormatter, createTranslator } from "use-intl/core";
import { formatsFor } from "@/i18n/formats";
import type { Locale } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import { STORE_TIME_ZONE } from "@/lib/config";

/**
 * Translator and formatter for one email, in the customer's language. Built from the same catalogs as
 * the pages but without a web request, so emails can also be sent from jobs and tests.
 */
export function emailContext(locale: Locale) {
  const catalog = messages[locale];
  const formats = formatsFor(locale);
  return {
    // the formats make ICU's `{n, number, integer}` read Arabic-Indic digits in Arabic, like on the site
    t: createTranslator({
      locale,
      messages: catalog,
      namespace: "Emails",
      formats,
      timeZone: STORE_TIME_ZONE,
    }),
    tCommon: createTranslator({
      locale,
      messages: catalog,
      namespace: "Common",
      formats,
      timeZone: STORE_TIME_ZONE,
    }),
    f: createFormatter({ locale, formats, timeZone: STORE_TIME_ZONE }),
  };
}

export type EmailContext = ReturnType<typeof emailContext>;
