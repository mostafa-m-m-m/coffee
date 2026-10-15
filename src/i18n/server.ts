import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Locale } from "./config";
import { routing } from "./routing";

/**
 * First line of every page and layout: validates the `[locale]` param and pins it for the
 * request, so next-intl can resolve it without reading headers (keeps the page prerenderable).
 */
export async function pinLocale(params: Promise<{ locale: string }>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return locale;
}

/** The request's locale, typed. Safe because every page pins and validates it first (`pinLocale`). */
export const currentLocale = async () => (await getLocale()) as Locale;
