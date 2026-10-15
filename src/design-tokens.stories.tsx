import type { Meta, StoryObj } from "@storybook/nextjs-vite";

const meta = { title: "Foundations/Tokens" } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const SURFACES = ["background", "card", "surface-2", "border"] as const;
const TEXT = ["foreground", "muted", "accent", "success", "warning", "danger", "info"] as const;
const SOFT = ["success-soft", "warning-soft", "danger-soft", "info-soft"] as const;
const CHARTS = [1, 2, 3, 4, 5] as const;

const swatch = (name: string) => (
  <figure key={name} className="m-0 w-36">
    <div
      className="h-14 rounded-xl border border-border"
      style={{ background: `var(--${name})` }}
    />
    <figcaption className="mt-1 font-mono text-xs">--{name}</figcaption>
  </figure>
);

/** Switch the theme and the language in the toolbar: every swatch is a CSS variable, so it follows. */
export const Colors: Story = {
  render: () => (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Surfaces</h2>
        <div className="flex flex-wrap gap-3">{SURFACES.map(swatch)}</div>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Text and status</h2>
        <div className="flex flex-wrap gap-3">{TEXT.map(swatch)}</div>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Soft status backgrounds</h2>
        <div className="flex flex-wrap gap-3">{SOFT.map(swatch)}</div>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">Chart series</h2>
        <div className="flex flex-wrap gap-3">{CHARTS.map((n) => swatch(`chart-${n}`))}</div>
      </section>
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Headings: Bricolage Grotesque (English) or IBM Plex Sans Arabic bold. Text: IBM Plex Sans /
        IBM Plex Sans Arabic. Numbers and ids: IBM Plex Mono.
      </p>
      <h1 className="text-3xl font-bold">Freshly roasted, every week</h1>
      <h2 className="text-2xl font-bold">Best sellers</h2>
      <h3 className="text-xl font-semibold">Ethiopia Yirgacheffe</h3>
      <p>
        Body text sits at 16px with a comfortable line height. Prices read as numbers: EGP 1,250.
      </p>
      <p className="text-sm text-muted-foreground">Small and muted: VAT included.</p>
      <p className="font-mono text-2xl">#2313 · EGP 885 · SKU BEAN-0003</p>
    </div>
  ),
};

export const ShapeAndSpacing: Story = {
  render: () => (
    <div className="flex flex-wrap items-end gap-4">
      {[
        ["rounded-lg", "8px"],
        ["rounded-xl", "12px"],
        ["rounded-2xl", "16px"],
        ["rounded-[20px]", "20px"],
      ].map(([cls, label]) => (
        <div
          key={label}
          className={`grid size-20 place-items-center border border-border bg-surface-2 text-xs ${cls}`}
        >
          {label}
        </div>
      ))}
    </div>
  ),
};
