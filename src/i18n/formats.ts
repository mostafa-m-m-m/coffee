import type { Locale } from "./config";
import { CURRENCY, STORE_TIME_ZONE } from "@/lib/config";

/**
 * Named formats for useFormatter()/getFormatter() and ICU `{x, number, integer}`.
 * Arabic reads Arabic-Indic digits, English reads Latin ones (EGP 1,250).
 * Identifiers (order numbers, SKUs, codes) are not formatted: they always stay Latin.
 */
export function formatsFor(locale: Locale) {
  const numberingSystem = locale === "ar" ? "arab" : "latn";
  return {
    dateTime: {
      date: { dateStyle: "medium", numberingSystem, timeZone: STORE_TIME_ZONE },
      dateShort: { day: "numeric", month: "short", numberingSystem, timeZone: STORE_TIME_ZONE },
      time: { hour: "2-digit", minute: "2-digit", numberingSystem, timeZone: STORE_TIME_ZONE },
    },
    number: {
      integer: { maximumFractionDigits: 0, numberingSystem },
      twoDigits: { minimumIntegerDigits: 2, useGrouping: false, numberingSystem },
      decimal: { minimumFractionDigits: 1, maximumFractionDigits: 1, numberingSystem },
      percent: { style: "percent", maximumFractionDigits: 0, numberingSystem },
      money: {
        style: "currency",
        currency: CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        numberingSystem,
      },
      moneyWhole: {
        style: "currency",
        currency: CURRENCY,
        maximumFractionDigits: 0,
        numberingSystem,
      },
    },
  } as const;
}

export type Formats = ReturnType<typeof formatsFor>;
