import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getNewCustomersSeries } from "@/lib/services/analytics";
import { addDaysIso, cairoToday } from "@/lib/time";
import { resolveRange } from "@/lib/validations/analytics";
import { makeUser, rawOrder, resetDb } from "./fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

describe("new customers per day (overview sparkline)", () => {
  it("counts a customer once, on the day of their first counted order, zero-filled", async () => {
    const today = cairoToday();
    const a = await makeUser("a@t.test");
    const b = await makeUser("b@t.test");
    const c = await makeUser("c@t.test");
    const at = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);

    await rawOrder(a.id, { createdAt: at(2), confirmedAt: at(2) }); // A's first order, two days ago
    await rawOrder(a.id, { createdAt: at(1), confirmedAt: at(1) }); // A again: not a new customer
    await rawOrder(b.id, { createdAt: at(0), confirmedAt: at(0) }); // B's first order, today
    await rawOrder(c.id, { status: "CANCELLED", createdAt: at(1), confirmedAt: null }); // never counted

    const r = resolveRange({ from: addDaysIso(today, -3), to: today, granularity: "day" });
    const series = await getNewCustomersSeries(r, r.fromDate, r.toDate);
    expect(series).toHaveLength(4);
    expect(series.reduce((n, x) => n + x, 0)).toBe(2);
    expect(series.at(-1)).toBe(1); // today: B
    expect(series.at(-3)).toBe(1); // two days ago: A
    expect(series.at(-2)).toBe(0); // yesterday: nobody new
  });
});
