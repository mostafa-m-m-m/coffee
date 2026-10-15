import { describe, expect, it } from "vitest";
import { brand, brandCss, toOklch } from "@/lib/brand";

const parse = (c: string) =>
  c
    .match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/)!
    .slice(1)
    .map(Number);

describe("design tokens", () => {
  it("converts hex to OKLCH", () => {
    expect(toOklch("#ffffff")).toBe("oklch(1 0 0)");
    expect(toOklch("#000000")).toBe("oklch(0 0 0)");
    const [l, c, h] = parse(toOklch("#c2410c")); // the ember: orange-red, mid lightness
    expect(l).toBeGreaterThan(0.5);
    expect(l).toBeLessThan(0.6);
    expect(c).toBeGreaterThan(0.15);
    expect(h).toBeGreaterThan(30);
    expect(h).toBeLessThan(45);
  });

  it("emits every design-system token for both themes, and no hex value", () => {
    const css = brandCss();
    const [light, dark] = [
      css.slice(css.indexOf(":root"), css.indexOf(".dark{")),
      css.slice(css.indexOf(".dark{")),
    ];
    for (const block of [light, dark]) {
      for (const token of [
        "--background",
        "--foreground",
        "--muted",
        "--card",
        "--surface-2",
        "--border",
        "--accent",
        "--accent-fg",
        "--success",
        "--warning",
        "--danger",
        "--info",
        "--success-soft",
        "--warning-ink",
        "--chart-1",
        "--chart-5",
        "--surface",
        "--primary",
        "--muted-foreground",
      ]) {
        expect(block, token).toContain(`${token}:`);
      }
      // the logo artwork keeps its fixed hex colors; everything themed is OKLCH
      expect(block.replace(/--logo-[a-z]+:#[0-9a-f]{6};/gi, "")).not.toMatch(/#[0-9a-f]{6}/i);
    }
  });

  it("keeps the two themes different where it matters", () => {
    expect(brand.light.background).not.toBe(brand.dark.background);
    expect(brand.light.accent).not.toBe(brand.dark.accent);
  });
});
