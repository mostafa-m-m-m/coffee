"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { Price } from "@/components/price";
import { moneyWhole } from "@/lib/format";

type Point = { date: string; salesCents: number; orders: number };

function useDay() {
  const f = useFormatter();
  return (iso: string) => f.dateTime(new Date(iso), "dateShort");
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const t = useTranslations("Admin.analytics.tooltip");
  const fmt = useDay();
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow">
      <p className="font-medium">{fmt(p.date)}</p>
      <p>
        {t("sales")}: <Price cents={p.salesCents} />
      </p>
      <p className="text-muted">
        {t("orders")}: {p.orders}
      </p>
    </div>
  );
}

/** One series, so no legend: the card title names it. Colors come from theme tokens (light/dark). */
export function SalesChart({ data }: { data: Point[] }) {
  const t = useTranslations("Admin.analytics");
  const f = useFormatter();
  const fmt = useDay();
  const tableId = useId();
  return (
    <div>
      <div dir="ltr" className="h-64 w-full" role="img" aria-label={t("sales.dailyChartLabel")}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmt}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--border)"
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v: number) => moneyWhole(f, v)}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              stroke="var(--border)"
              width={96}
            />
            <Tooltip
              content={ChartTooltip}
              cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
            />
            <Line
              type="monotone"
              dataKey="salesCents"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted">{t("asTable")}</summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table id={tableId} className="w-full text-start">
            <thead className="sticky top-0 bg-card">
              <tr>
                <th className="p-1 text-start">{t("tableDate")}</th>
                <th className="p-1 text-start">{t("tooltip.sales")}</th>
                <th className="p-1 text-start">{t("tooltip.orders")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date} className="border-t border-border">
                  <td className="p-1">{fmt(d.date)}</td>
                  <td className="p-1">
                    <Price cents={d.salesCents} />
                  </td>
                  <td className="p-1">{d.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
