import { z } from "zod";
import type { DayRange, Granularity } from "@/lib/services/analytics";
import { addDaysIso, cairoStartOfDay, cairoToday, DAY_MS } from "@/lib/time";

const MAX_SPAN_DAYS = 400;
const DEFAULT_SPAN_DAYS = 30;

const isoDate = z.iso.date();

export const analyticsQuerySchema = z.object({
  from: isoDate.optional().catch(undefined),
  to: isoDate.optional().catch(undefined),
  granularity: z.enum(["day", "week", "month"]).optional().catch(undefined),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/** Reads ?from&to&granularity off a request URL and resolves the effective range. */
export function rangeFromRequest(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  return resolveRange(analyticsQuerySchema.parse(params));
}

const daysBetween = (a: string, b: string) =>
  Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / DAY_MS,
  );

const dayRange = (fromDate: string, toDate: string): DayRange => ({
  fromDate,
  toDate,
  from: cairoStartOfDay(fromDate),
  to: cairoStartOfDay(addDaysIso(toDate, 1)), // `to` is exclusive
});

/**
 * `from`/`to` are inclusive Cairo calendar dates from the UI. Defaults to the last 30 days
 * ending today. Spans are clamped so a hand-edited URL can't ask for years of data.
 * `previous` is the period of the same length right before.
 */
export function resolveRange(
  q: AnalyticsQuery,
  now = new Date(),
): DayRange & { granularity: Granularity; previous: DayRange } {
  let toDate = q.to ?? cairoToday(now);
  let fromDate = q.from ?? addDaysIso(toDate, -(DEFAULT_SPAN_DAYS - 1));
  if (fromDate > toDate) fromDate = addDaysIso(toDate, -(DEFAULT_SPAN_DAYS - 1));
  if (daysBetween(fromDate, toDate) + 1 > MAX_SPAN_DAYS)
    fromDate = addDaysIso(toDate, -(MAX_SPAN_DAYS - 1));
  toDate = toDate < fromDate ? fromDate : toDate;

  const days = daysBetween(fromDate, toDate) + 1;
  const granularity = q.granularity ?? (days <= 62 ? "day" : days <= 200 ? "week" : "month");
  return {
    ...dayRange(fromDate, toDate),
    granularity,
    previous: dayRange(addDaysIso(fromDate, -days), addDaysIso(fromDate, -1)),
  };
}
