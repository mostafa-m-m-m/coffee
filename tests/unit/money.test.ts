import { describe, expect, it } from "vitest";
import { createFormatter } from "use-intl/core";
import { formatsFor } from "@/i18n/formats";
import { money } from "@/lib/format";
import { addDaysIso, cairoStartOfDay, cairoToday } from "@/lib/time";
import {
  computeTotals,
  qualifiesForFreeShipping,
  remainingForFreeShipping,
  shippingFor,
  vatIncluded,
} from "@/lib/pricing";

const formatter = (locale: "ar" | "en") =>
  createFormatter({ locale, formats: formatsFor(locale), timeZone: "Africa/Cairo" });

describe("pricing", () => {
  it("extracts the VAT that is already inside a price (14%)", () => {
    expect(vatIncluded(11400)).toBe(1400);
    expect(vatIncluded(45000)).toBe(5526);
    expect(vatIncluded(0)).toBe(0);
  });

  it("ships free from 1,000 EGP, otherwise charges the zone's fee", () => {
    expect(qualifiesForFreeShipping(99_999)).toBe(false);
    expect(qualifiesForFreeShipping(100_000)).toBe(true);
    expect(shippingFor(50_000, 6500)).toBe(6500);
    expect(shippingFor(100_000, 6500)).toBe(0);
    expect(shippingFor(0, 6500)).toBe(0);
    expect(remainingForFreeShipping(75_000)).toBe(25_000);
    expect(remainingForFreeShipping(150_000)).toBe(0);
  });

  it("computes everything an order stores from the subtotal and the zone", () => {
    expect(computeTotals(40000, 5000)).toEqual({
      subtotalCents: 40000,
      shippingCents: 5000,
      totalCents: 45000,
      vatCents: 5526,
    });
    expect(computeTotals(120000, 8500)).toMatchObject({ shippingCents: 0, totalCents: 120000 });
  });
});

describe("money formatting", () => {
  it("English: EGP with Latin digits", () => {
    const text = money(formatter("en"), 125_000);
    expect(text).toContain("EGP");
    expect(text).toContain("1,250");
    expect(text).not.toMatch(/[٠-٩]/);
  });

  it("Arabic: Arabic-Indic digits with the pound sign", () => {
    const text = money(formatter("ar"), 125_000);
    expect(text).toMatch(/١[,٬]٢٥٠/);
    expect(text).toContain("ج.م");
  });

  it("shows qirsh only when there are some", () => {
    expect(money(formatter("en"), 12_550)).toContain("125.50");
    expect(money(formatter("en"), 12_500)).not.toContain(".");
  });
});

describe("Cairo calendar", () => {
  it("day boundaries follow Egypt's summer time", () => {
    expect(cairoStartOfDay("2026-01-15").toISOString()).toBe("2026-01-14T22:00:00.000Z"); // UTC+2
    expect(cairoStartOfDay("2026-07-15").toISOString()).toBe("2026-07-14T21:00:00.000Z"); // UTC+3
  });

  it("knows what day it is in Cairo, and does date arithmetic on plain dates", () => {
    expect(cairoToday(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
    expect(cairoToday(new Date("2026-06-30T20:30:00Z"))).toBe("2026-06-30");
    expect(addDaysIso("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
  });
});
