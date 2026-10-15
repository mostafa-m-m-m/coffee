import { STORE_TIME_ZONE } from "@/lib/config";

export const DAY_MS = 86_400_000;

const offsetFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: STORE_TIME_ZONE,
  timeZoneName: "longOffset",
});

/** The store's UTC offset (minutes) at an instant: +120 in winter, +180 while Egypt observes DST. */
function offsetMinutes(at: Date): number {
  const name = offsetFmt.formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (!m) return 0;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** The instant at which a Cairo calendar day ("2026-06-01") begins. */
export function cairoStartOfDay(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const asUtc = Date.UTC(y, m - 1, d);
  const first = new Date(asUtc - offsetMinutes(new Date(asUtc)) * 60_000);
  // re-check: the offset at the resulting instant may differ right at a DST change
  return new Date(asUtc - offsetMinutes(first) * 60_000);
}

/** Today's date in Cairo, as "YYYY-MM-DD". */
export function cairoToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: STORE_TIME_ZONE }).format(now);
}

/** Date arithmetic on plain ISO calendar dates (no time zone involved). */
export function addDaysIso(isoDate: string, n: number): string {
  return new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + n * DAY_MS)
    .toISOString()
    .slice(0, 10);
}
