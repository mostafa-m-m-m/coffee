import { z } from "zod";
import type { Locale } from "@/i18n/config";
import { defaultLocale, locales } from "@/i18n/config";

/** Text a customer reads, stored once per language: `{ "en": "...", "ar": "..." }`. */
export type LocalizedText = Record<Locale, string>;

export const localizedTextSchema = (opts: { min?: number; minKey?: string } = {}) =>
  z.object(
    Object.fromEntries(
      locales.map((l) => [
        l,
        z
          .string()
          .trim()
          .min(opts.min ?? 1, opts.minKey ?? "validation.localizedRequired"),
      ]),
    ) as Record<Locale, z.ZodString>,
  );

export const emptyLocalized = (): LocalizedText =>
  Object.fromEntries(locales.map((l) => [l, ""])) as LocalizedText;

/** Reads a Json column (or any unknown) as LocalizedText; tolerant of legacy plain strings. */
export function asLocalized(value: unknown): LocalizedText {
  if (typeof value === "string")
    return Object.fromEntries(locales.map((l) => [l, value])) as LocalizedText;
  const obj = (value ?? {}) as Partial<LocalizedText>;
  return Object.fromEntries(locales.map((l) => [l, obj[l] ?? ""])) as LocalizedText;
}

/** The text in the user's language, falling back to the other one if it is missing. */
export function pick(value: unknown, locale: Locale): string {
  const t = asLocalized(value);
  return t[locale] || t[defaultLocale] || Object.values(t).find(Boolean) || "";
}

/** Lower-cased concatenation of every language, what product search runs on. */
export const buildSearchText = (...parts: unknown[]) =>
  parts
    .flatMap((p) => Object.values(asLocalized(p)))
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
