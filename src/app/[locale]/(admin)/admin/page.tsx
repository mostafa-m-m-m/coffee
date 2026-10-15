import { getFormatter, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/admin/auto-refresh";
import { SalesChart } from "@/components/admin/sales-chart";
import { PaymentBadge, StatusBadge } from "@/components/patterns/status-badge";
import { KpiCard } from "@/components/patterns/kpi-card";
import { Price } from "@/components/price";
import { Link } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { db } from "@/lib/db";
import { pick } from "@/lib/i18n/localized";
import {
  getCodOutstanding,
  getLowStock,
  getNewCustomersSeries,
  getSummary,
  getTimeseries,
  pctChange,
} from "@/lib/services/analytics";
import { addDaysIso, cairoToday } from "@/lib/time";
import { resolveRange } from "@/lib/validations/analytics";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.overview" });
  return { title: t("metaTitle") };
}

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
type RangeKey = keyof typeof RANGES;

async function Overview({ range }: { range: RangeKey }) {
  await connection();
  const t = await getTranslations("Admin.overview");
  const f = await getFormatter(); // "today" is request-time data: declare it before reading the clock
  const locale = await currentLocale();
  const days = RANGES[range];
  const toDate = cairoToday();
  const r = resolveRange({ from: addDaysIso(toDate, -(days - 1)), to: toDate, granularity: "day" });

  const [{ current, previous }, series, recent, lowStock, cod, newSeries] = await Promise.all([
    getSummary(r, r.previous),
    getTimeseries(r, "day", r.fromDate, r.toDate),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        totalCents: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    getLowStock(),
    getCodOutstanding(),
    getNewCustomersSeries(r, r.fromDate, r.toDate),
  ]);

  return (
    <>
      <section aria-label={t("kpiLabel")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t("kpi.sales")}
          value={<Price cents={current.salesCents} />}
          change={pctChange(current.salesCents, previous.salesCents)}
          trend={series.map((d) => d.salesCents)}
        />
        <KpiCard
          label={t("kpi.orders")}
          value={f.number(current.orders, "integer")}
          change={pctChange(current.orders, previous.orders)}
          trend={series.map((d) => d.orders)}
        />
        <KpiCard
          label={t("kpi.aov")}
          value={<Price cents={current.aovCents} />}
          change={pctChange(current.aovCents, previous.aovCents)}
          trend={series.map((d) => (d.orders ? Math.round(d.salesCents / d.orders) : 0))}
        />
        <KpiCard
          label={t("kpi.newCustomers")}
          value={f.number(current.newCustomers, "integer")}
          change={pctChange(current.newCustomers, previous.newCustomers)}
          trend={newSeries}
        />
      </section>

      <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
        {t.rich("codOutstanding", {
          amount: () => <Price cents={cod.totalCents} className="font-semibold" />,
          orders: f.number(cod.orders, "integer"),
        })}
      </p>

      <section aria-labelledby="sales" className="rounded-lg border border-border bg-card p-4">
        <h2 id="sales" className="mb-3 font-semibold">
          {t("dailySales")}
        </h2>
        <SalesChart data={series} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section aria-labelledby="recent" className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent" className="font-semibold">
              {t("recentOrders")}
            </h2>
            <Link href="/admin/orders" className="text-sm underline">
              {t("viewAll")}
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                  #{o.orderNumber}
                </Link>
                <span>{o.user.name}</span>
                <StatusBadge status={o.status} />
                <PaymentBadge status={o.paymentStatus} />
                <span className="text-muted">{f.dateTime(o.createdAt, "date")}</span>
                <Price cents={o.totalCents} className="font-medium" />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="low" className="rounded-lg border border-border bg-card p-4">
          <h2 id="low" className="mb-3 font-semibold">
            {t("stockAlerts")}
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-muted">{t("stockOk")}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {lowStock.map((v) => (
                <li key={v.id} className="flex items-start justify-between gap-2">
                  <span>
                    {pick(v.product, locale)} — {pick(v.variant, locale)}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                      v.stock === 0 ? "border-danger text-danger" : "border-warning text-warning"
                    }`}
                  >
                    {v.stock === 0 ? t("soldOut") : t("left", { count: v.stock })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-border" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-lg bg-border" />
    </div>
  );
}

async function Page({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/admin">["searchParams"];
}) {
  const t = await getTranslations("Admin.overview");
  const sp = await searchParams;
  const raw = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const range: RangeKey = raw && raw in RANGES ? (raw as RangeKey) : "30d";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <nav aria-label={t("period")} className="flex gap-1 text-sm">
          {(Object.keys(RANGES) as RangeKey[]).map((k) => (
            <Link
              key={k}
              href={k === "30d" ? "/admin" : `/admin?range=${k}`}
              aria-current={k === range ? "true" : undefined}
              className={`rounded-md border px-3 py-1 ${
                k === range ? "border-accent bg-accent text-accent-fg" : "border-border"
              }`}
            >
              {t(`ranges.${k}`)}
            </Link>
          ))}
        </nav>
      </div>
      <AutoRefresh seconds={30} />
      <Suspense key={range} fallback={<OverviewSkeleton />}>
        <Overview range={range} />
      </Suspense>
    </div>
  );
}

export default async function AdminHome(props: PageProps<"/[locale]/admin">) {
  await pinLocale(props.params);
  return (
    <main>
      <Suspense fallback={<OverviewSkeleton />}>
        <Page searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
