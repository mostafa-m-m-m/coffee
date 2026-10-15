/**
 * Single source of truth for the Ember Roastery palette (derived from public/logo-*.svg).
 * globals.css gets these through the generated `brandCss()` block in the root layout, and the
 * PDF invoice / OG image read the same values, so no hex is ever duplicated in components.
 */
export const brand = {
  name: "Ember Roastery",
  shortName: "Ember",
  gatewayName: "Ember Pay",
  light: {
    background: "#faf6f1",
    foreground: "#1c1612",
    muted: "#6b5748",
    card: "#ffffff",
    surface2: "#f1e9df",
    border: "#e6dcd1",
    accent: "#c2410c",
    accentHover: "#a8360a",
    accentFg: "#ffffff",
    glow: "#ffa15c",
    danger: "#b91c1c",
    dangerFg: "#ffffff",
    success: "#15803d",
    successFg: "#ffffff",
    warning: "#9a6a12",
    info: "#2f6690",
    hero: "#1c1612",
    heroFg: "#faf6f1",
    scrim: "rgb(28 22 18 / 0.55)",
    series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"],
  },
  dark: {
    background: "#17110d",
    foreground: "#f3ece4",
    muted: "#b8a394",
    card: "#211914",
    surface2: "#2b211c",
    border: "#3a2c23",
    accent: "#e4572e",
    accentHover: "#f0693f",
    accentFg: "#1c1612",
    glow: "#ffa15c",
    danger: "#f87171",
    dangerFg: "#1c1612",
    success: "#4ade80",
    successFg: "#1c1612",
    warning: "#e0a93a",
    info: "#6fa8d6",
    hero: "#261b15",
    heroFg: "#faf6f1",
    scrim: "rgb(0 0 0 / 0.65)",
    series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300"],
  },
  /** Roast-brown grounds for the generated product artwork (app/img/[slug]). */
  grounds: ["#2b1f18", "#3a2a20", "#33241b", "#46322a", "#2f221b", "#3d2c22", "#50382b", "#261b15"],
  /** Fixed artwork colors for the logo itself (never themed). */
  logo: {
    espresso: "#1c1612",
    crema: "#faf6f1",
    ember: "#e4572e",
    glow: "#ffa15c",
    taupe: "#7d6556",
  },
} as const;

type Palette = (typeof brand)["light"] | (typeof brand)["dark"];

const kebab = (s: string) =>
  s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/(\d+)$/, "-$1");

/** "#c2410c" -> "oklch(0.5 0.17 38)": the format Tailwind 4 uses, so alpha and mixing stay perceptually even. */
export function toOklch(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  const H = C < 0.0004 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  const f = (x: number, d: number) => Number(x.toFixed(d));
  return `oklch(${f(L, 4)} ${f(C, 4)} ${f(H, 2)})`;
}

const css = (v: string) => (v.startsWith("#") ? toOklch(v) : v);

function vars(p: Palette) {
  const { series, ...rest } = p;
  const lines = Object.entries(rest).map(([k, v]) => `--${kebab(k)}:${css(v)};`);
  series.forEach((c, i) => {
    lines.push(`--series-${i + 1}:${css(c)};`);
    lines.push(`--chart-${i + 1}:${css(c)};`);
  });
  // names of the design system (see docs/design-system.md); they point at the values above
  lines.push(
    "--surface:var(--card);",
    "--muted-foreground:var(--muted);",
    "--primary:var(--accent);",
    "--primary-foreground:var(--accent-fg);",
    // soft status backgrounds: the status color mixed into the card, so both themes stay in tone
    "--success-soft:color-mix(in oklab,var(--success) 14%,var(--card));",
    "--warning-soft:color-mix(in oklab,var(--warning) 16%,var(--card));",
    "--danger-soft:color-mix(in oklab,var(--danger) 13%,var(--card));",
    "--info-soft:color-mix(in oklab,var(--info) 14%,var(--card));",
    // text on those soft backgrounds: the status color pulled toward the foreground, so it keeps 4.5:1 in both themes
    "--success-ink:color-mix(in oklab,var(--success) 70%,var(--foreground));",
    "--warning-ink:color-mix(in oklab,var(--warning) 70%,var(--foreground));",
    "--danger-ink:color-mix(in oklab,var(--danger) 70%,var(--foreground));",
    "--info-ink:color-mix(in oklab,var(--info) 70%,var(--foreground));",
    "--accent-ink:color-mix(in oklab,var(--accent) 80%,var(--foreground));",
  );
  return lines.join("");
}

const logoVars = () =>
  Object.entries(brand.logo)
    .map(([k, v]) => `--logo-${k}:${v};`)
    .join("");

/** CSS custom properties for both themes (+ the fixed logo artwork colors), injected once in <head>. */
export const brandCss = () => `:root{${vars(brand.light)}${logoVars()}}.dark{${vars(brand.dark)}}`;
