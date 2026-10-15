import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // /ar/... and /en/... always: the language is part of the URL, so every page is cacheable per locale
  localePrefix: "always",
});
