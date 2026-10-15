export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

/** Text direction per locale: drives <html dir>, and everything else follows via logical CSS properties. */
export const directions: Record<Locale, "rtl" | "ltr"> = { ar: "rtl", en: "ltr" };

/** Name shown for each locale in the language switcher (always in its own language, never translated). */
export const localeNames: Record<Locale, string> = { ar: "العربية", en: "English" };
export const localeCodes: Record<Locale, string> = { ar: "AR", en: "EN" };

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);
