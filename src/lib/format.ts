import type { useFormatter } from "next-intl";

type Formatter = ReturnType<typeof useFormatter>;

/**
 * Locale-aware money from qirsh: "EGP 1,250" in English, Arabic-Indic digits and the pound sign in
 * Arabic. Whole pounds show no decimals, anything else shows two. Callers get the formatter from
 * useFormatter()/getFormatter(); render it inside <Price/>, which isolates the text so it keeps its
 * order inside a sentence of the other direction.
 */
export const money = (f: Formatter, cents: number) =>
  f.number(cents / 100, cents % 100 === 0 ? "moneyWhole" : "money");

/** Whole-pound variant for chart axes. */
export const moneyWhole = (f: Formatter, cents: number) => f.number(cents / 100, "moneyWhole");
