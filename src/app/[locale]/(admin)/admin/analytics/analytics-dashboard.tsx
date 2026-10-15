"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { EngagementCards } from "./engagement-cards";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useUrlState } from "@/hooks/use-url-state";
import { Link, useRouter } from "@/i18n/navigation";
import { pick, type LocalizedText } from "@/lib/i18n/localized";
import { addDaysIso, cairoToday } from "@/lib/time";
import { money, moneyWhole } from "@/lib/format";
import { Price } from "@/components/price";

type Point = {
  date: string;
  salesCents: number;
  orders: number;
  previousDate: string | null;
  previousSalesCents: number | null;
};
type Kpis = { salesCents: number; orders: number; aovCents: number; newCustomers: number };
type Summary = { current: Kpis; previous: Kpis; range: { from: string; to: string } };
type RankedRaw = { slug: string; name: LocalizedText; salesCents: number; units: number };
type Ranked = { slug: string; name: string; salesCents: number; units: number };
type WeekRow = { week: string } & Record<string, number>;
type Granularity = "day" | "week" | "month";

const STATUS_ORDER = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const DAY = 86_400_000;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (isoDate: string, n: number) =>
  iso(new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + n * DAY));
const axis = { fill: "var(--muted)", fontSize: 12 };

/** Last day (inclusive) of the bucket that starts on `start`. */
function bucketEnd(start: string, g: Granularity) {
  if (g === "day") return start;
  if (g === "week") return addDays(start, 6);
  const d = new Date(`${start}T00:00:00Z`);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

function useApi<T>(path: string, qs: string) {
  return useQuery<T>({
    queryKey: ["analytics", path, qs],
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics/${path}?${qs}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });
}

function Card({
  title,
  hint,
  q,
  children,
}: {
  title: string;
  hint?: string;
  q: { isLoading: boolean; isError: boolean; refetch: () => void; data: unknown };
  children: React.ReactNode;
}) {
  const t = useTranslations("Admin.analytics");
  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-2 text-xs text-muted">{hint}</p>}
      {q.isLoading ? (
        <div className="mt-2 h-64 animate-pulse rounded bg-border" aria-busy="true" />
      ) : q.isError ? (
        <div role="alert" className="py-10 text-center">
          <p className="mb-3">{t("loadError")}</p>
          <button
            onClick={q.refetch}
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            {t("retry")}
          </button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function Empty() {
  const t = useTranslations("Admin.analytics");
  return <p className="py-16 text-center text-muted">{t("empty")}</p>;
}

function Tip({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow">
      {rows.map(([k, v], i) => (
        <p key={k} className={i === 0 ? "font-medium" : "text-muted"}>
          {k}
          {v && `: ${v}`}
        </p>
      ))}
    </div>
  );
}

function Kpi({
  label,
  value,
  cur,
  prev,
  compare = true,
}: {
  label: string;
  value: React.ReactNode;
  cur: number;
  prev: number;
  compare?: boolean;
}) {
  const t = useTranslations("Admin.overview.kpi");
  const f = useFormatter();
  const change = prev === 0 ? null : ((cur - prev) / prev) * 100;
  const up = change !== null && change > 0;
  const down = change !== null && change < 0;
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p
        className={`mt-1 text-sm ${up ? "text-success" : down ? "text-danger" : "text-muted"}`}
        hidden={!compare}
      >
        {change === null ? (
          "—"
        ) : (
          <>
            <span aria-hidden>{up ? "▲" : down ? "▼" : "–"}</span>{" "}
            <bdi dir="ltr">{t("percent", { value: f.number(Math.abs(change), "decimal") })}</bdi>{" "}
            <span className="text-muted">{t("vsPrevious")}</span>
          </>
        )}
      </p>
    </div>
  );
}

const presets = () => {
  const today = cairoToday(); // ranges are Cairo calendar days, whatever the browser's time zone
  const ago = (n: number) => addDaysIso(today, -n);
  return [
    { key: "d7", from: ago(6), to: today },
    { key: "d30", from: ago(29), to: today },
    { key: "m3", from: ago(89), to: today },
    { key: "m12", from: ago(364), to: today },
  ] as const;
};

export function AnalyticsDashboard() {
  const t = useTranslations("Admin.analytics");
  const tStatus = useTranslations("Common.status");
  const f = useFormatter();
  const locale = useLocale() as "ar" | "en";
  const fmt = (d: string) => f.dateTime(new Date(`${d}T00:00:00Z`), "dateShort");
  const axisMoney = (v: number) => moneyWhole(f, v);
  const router = useRouter();
  const { params, patch } = useUrlState();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const granularity = (params.get("granularity") ?? "") as Granularity | "";
  // comparing with the previous period is on unless ?compare=0
  const compare = params.get("compare") !== "0";

  const qs = new URLSearchParams(
    Object.entries({ from, to, granularity }).filter(([, v]) => v),
  ).toString();

  const summary = useApi<Summary>("summary", qs);
  const series = useApi<{ granularity: Granularity; points: Point[] }>("timeseries", qs);
  const categories = useApi<RankedRaw[]>("categories", qs);
  const top = useApi<RankedRaw[]>("top-products", qs);
  const statuses = useApi<WeekRow[]>("statuses", qs);

  // the API returns the effective range as inclusive Cairo dates
  const effFrom = summary.data ? summary.data.range.from : "";
  const effTo = summary.data ? summary.data.range.to : "";
  const g = series.data?.granularity ?? "day";

  /** Open the orders table with the chart's selection applied (and the page's date range). */
  function drill(extra: Record<string, string>, range = { from: effFrom, to: effTo }) {
    const sp = new URLSearchParams({
      ...(range.from && { from: range.from }),
      ...(range.to && { to: range.to }),
      ...extra,
    });
    router.push(`/admin/orders?${sp}`);
  }
  const drillHref = (extra: Record<string, string>, range = { from: effFrom, to: effTo }) =>
    `/admin/orders?${new URLSearchParams({ ...(range.from && { from: range.from }), ...(range.to && { to: range.to }), ...extra })}`;

  const exportQs = new URLSearchParams({
    ...(effFrom && { from: effFrom }),
    ...(effTo && { to: effTo }),
  }).toString();
  const input = inputVariants({ size: "sm" });

  const catData: Ranked[] = (categories.data ?? []).map((c) => ({
    ...c,
    name: pick(c.name, locale),
  }));
  const topRanked: Ranked[] = (top.data ?? []).map((p) => ({ ...p, name: pick(p.name, locale) }));
  const topData = topRanked.map((p) => ({
    ...p,
    label: p.name.length > 28 ? `${p.name.slice(0, 27)}…` : p.name,
  }));

  return (
    <div className="space-y-6">
      {/* controls */}
      <form
        role="search"
        aria-label={t("filtersLabel")}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="a-from" className="text-xs text-muted">
            {t("from")}
          </label>
          <input
            id="a-from"
            type="date"
            value={from || effFrom}
            onChange={(e) => patch({ from: e.target.value })}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="a-to" className="text-xs text-muted">
            {t("to")}
          </label>
          <input
            id="a-to"
            type="date"
            value={to || effTo}
            onChange={(e) => patch({ to: e.target.value })}
            className={input}
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("presetsLabel")}>
          {presets().map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => patch({ from: p.from, to: p.to })}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "text-xs")}
            >
              {t(`presets.${p.key}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="a-g" className="text-xs text-muted">
            {t("granularity")}
          </label>
          <select
            id="a-g"
            value={granularity}
            onChange={(e) => patch({ granularity: e.target.value })}
            className={input}
          >
            <option value="">{t("granularities.auto")}</option>
            <option value="day">{t("granularities.day")}</option>
            <option value="week">{t("granularities.week")}</option>
            <option value="month">{t("granularities.month")}</option>
          </select>
        </div>
        <label className="flex items-center gap-2 pb-1.5 text-sm">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => patch({ compare: e.target.checked ? "" : "0" })}
          />
          {t("compare")}
        </label>
        <div className="ms-auto flex gap-2">
          <a
            // new tab: Next's client router intercepts same-tab clicks (and cancels the download);
            // the server's Content-Disposition makes the browser save the file and close the tab
            target="_blank"
            rel="noopener"
            href={`/api/admin/export/orders?${exportQs}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {t("exportCsv")}
          </a>
          <a
            target="_blank"
            rel="noopener"
            href={`/api/admin/export/report?${qs}`}
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            {t("exportPdf")}
          </a>
        </div>
      </form>

      {/* KPIs */}
      <section aria-label={t("kpiLabel")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.data ? (
          <>
            <Kpi
              label={t("kpi.sales")}
              value={<Price cents={summary.data.current.salesCents} />}
              cur={summary.data.current.salesCents}
              prev={summary.data.previous.salesCents}
              compare={compare}
            />
            <Kpi
              label={t("kpi.orders")}
              value={f.number(summary.data.current.orders, "integer")}
              cur={summary.data.current.orders}
              prev={summary.data.previous.orders}
              compare={compare}
            />
            <Kpi
              label={t("kpi.aov")}
              value={<Price cents={summary.data.current.aovCents} />}
              cur={summary.data.current.aovCents}
              prev={summary.data.previous.aovCents}
              compare={compare}
            />
            <Kpi
              label={t("kpi.newCustomers")}
              value={String(summary.data.current.newCustomers)}
              cur={summary.data.current.newCustomers}
              prev={summary.data.previous.newCustomers}
              compare={compare}
            />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-border" />
          ))
        )}
      </section>

      {/* sales over time, with the previous period for comparison */}
      <Card title={t("sales.title")} hint={t("sales.hint")} q={series}>
        {series.data && series.data.points.length > 0 ? (
          <>
            <div dir="ltr" className="h-72" role="img" aria-label={t("sales.chartLabel")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={series.data.points}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  onClick={(s) => {
                    const i = Number(
                      (s as { activeTooltipIndex?: number | string })?.activeTooltipIndex,
                    );
                    const p = series.data!.points[i];
                    if (p) drill({}, { from: p.date, to: bucketEnd(p.date, g) });
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmt}
                    tick={axis}
                    stroke="var(--border)"
                    minTickGap={24}
                  />
                  <YAxis tickFormatter={axisMoney} tick={axis} stroke="var(--border)" width={96} />
                  <Tooltip
                    cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as Point;
                      return (
                        <Tip
                          rows={[
                            [fmt(p.date), ""],
                            [t("tooltip.sales"), money(f, p.salesCents)],
                            [t("tooltip.orders"), f.number(p.orders, "integer")],
                            ...(compare && p.previousSalesCents !== null && p.previousDate
                              ? ([
                                  [
                                    t("tooltip.previous", { date: fmt(p.previousDate) }),
                                    money(f, p.previousSalesCents),
                                  ],
                                ] as [string, string][])
                              : []),
                          ]}
                        />
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    formatter={(v: string) => <span className="text-foreground">{v}</span>}
                  />
                  <Line
                    name={t("sales.current")}
                    type="monotone"
                    dataKey="salesCents"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                  {compare && (
                    <Line
                      name={t("sales.previous")}
                      type="monotone"
                      dataKey="previousSalesCents"
                      stroke="var(--muted)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <Empty />
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* by category */}
        <Card title={t("categories.title")} hint={t("categories.hint")} q={categories}>
          {catData.length > 0 ? (
            <>
              <div dir="ltr" className="h-64" role="img" aria-label={t("categories.chartLabel")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={catData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={axis} stroke="var(--border)" interval={0} />
                    <YAxis
                      tickFormatter={axisMoney}
                      tick={axis}
                      stroke="var(--border)"
                      width={96}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--border)", opacity: 0.4 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const r = payload[0].payload as Ranked;
                        return (
                          <Tip
                            rows={[
                              [r.name, ""],
                              [t("tooltip.sales"), money(f, r.salesCents)],
                              [t("tooltip.units"), String(r.units)],
                            ]}
                          />
                        );
                      }}
                    />
                    <Bar
                      dataKey="salesCents"
                      fill="var(--accent)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={56}
                      isAnimationActive={false}
                      cursor="pointer"
                      onClick={(d) => drill({ category: (d as unknown as Ranked).slug })}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DrillTable
                rows={catData.map((c) => ({
                  key: c.slug,
                  label: c.name,
                  value: money(f, c.salesCents),
                  href: drillHref({ category: c.slug }),
                }))}
              />
            </>
          ) : (
            <Empty />
          )}
        </Card>

        {/* top products */}
        <Card title={t("top.title")} hint={t("top.hint")} q={top}>
          {topData.length > 0 ? (
            <>
              <div dir="ltr" className="h-80" role="img" aria-label={t("top.chartLabel")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topData}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke="var(--border)"
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tickFormatter={axisMoney}
                      tick={axis}
                      stroke="var(--border)"
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={axis}
                      stroke="var(--border)"
                      width={150}
                      interval={0}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--border)", opacity: 0.4 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const r = payload[0].payload as Ranked;
                        return (
                          <Tip
                            rows={[
                              [r.name, ""],
                              [t("tooltip.sales"), money(f, r.salesCents)],
                              [t("tooltip.units"), String(r.units)],
                            ]}
                          />
                        );
                      }}
                    />
                    <Bar
                      dataKey="salesCents"
                      fill="var(--accent)"
                      radius={[0, 4, 4, 0]}
                      barSize={16}
                      isAnimationActive={false}
                      cursor="pointer"
                      onClick={(d) => drill({ product: (d as unknown as Ranked).slug })}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <DrillTable
                rows={topRanked.map((p) => ({
                  key: p.slug,
                  label: p.name,
                  value: `${money(f, p.salesCents)} · ${p.units}`,
                  href: drillHref({ product: p.slug }),
                }))}
              />
            </>
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      <EngagementCards qs={qs} />

      {/* status distribution */}
      <Card title={t("statuses.title")} hint={t("statuses.hint")} q={statuses}>
        {statuses.data && statuses.data.length > 0 ? (
          <>
            <div dir="ltr" className="h-72" role="img" aria-label={t("statuses.chartLabel")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statuses.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="week"
                    tickFormatter={fmt}
                    tick={axis}
                    stroke="var(--border)"
                    minTickGap={16}
                  />
                  <YAxis
                    tick={axis}
                    stroke="var(--border)"
                    width={40}
                    allowDecimals={false}
                    tickFormatter={(v: number) => f.number(v, "integer")}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--border)", opacity: 0.4 }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <Tip
                          rows={[
                            [t("statuses.week", { date: fmt(String(label)) }), ""],
                            ...STATUS_ORDER.map(
                              (s) =>
                                [tStatus(s), String((payload[0].payload as WeekRow)[s] ?? 0)] as [
                                  string,
                                  string,
                                ],
                            ),
                          ]}
                        />
                      );
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    formatter={(v: string) => (
                      <span className="text-foreground">
                        {tStatus(v as (typeof STATUS_ORDER)[number])}
                      </span>
                    )}
                  />
                  {STATUS_ORDER.map((s, i) => (
                    <Bar
                      key={s}
                      dataKey={s}
                      name={s}
                      stackId="status"
                      fill={`var(--series-${i + 1})`}
                      stroke="var(--card)" // 2px surface gap between stacked segments
                      strokeWidth={2}
                      maxBarSize={40}
                      isAnimationActive={false}
                      cursor="pointer"
                      onClick={(d) => {
                        const week = (d as unknown as WeekRow).week;
                        drill({ status: s }, { from: week, to: addDays(week, 6) });
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <Empty />
        )}
      </Card>
    </div>
  );
}

/** Keyboard/screen-reader path to the same drill-down the chart clicks provide. */
function DrillTable({
  rows,
}: {
  rows: { key: string; label: string; value: string; href: string }[];
}) {
  const t = useTranslations("Admin.analytics");
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-muted">{t("asTable")}</summary>
      <ul className="mt-2 divide-y divide-border">
        {rows.map((r) => (
          <li key={r.key} className="flex justify-between gap-3 py-1.5">
            <Link href={r.href} className="underline">
              {r.label}
            </Link>
            <span>{r.value}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
