"use client";

import { buttonVariants } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import { money } from "@/lib/format";
import { isGovernorate } from "@/lib/geo";

type Funnel = {
  stage: "PRODUCT_VIEW" | "ADD_TO_CART" | "CHECKOUT_START" | "ORDER_PLACED";
  sessions: number;
}[];
type Abandoned = { carts: number; valueCents: number; idleMinutes: number };
type Governorates = { governorate: string; orders: number; salesCents: number }[];
type Payments = { method: "CARD" | "COD"; orders: number; salesCents: number }[];

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
  hint: string;
  q: { isLoading: boolean; isError: boolean; refetch: () => void };
  children: React.ReactNode;
}) {
  const t = useTranslations("Admin.analytics");
  return (
    <section className="rounded-lg border border-border bg-card p-4" aria-label={title}>
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      {q.isLoading ? (
        <div className="h-40 animate-pulse rounded bg-border" aria-busy="true" />
      ) : q.isError ? (
        <div role="alert" className="py-8 text-center">
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

/** A horizontal bar whose length is `value / max`. The numbers beside it carry the meaning; the bar is a quick read. */
function Bar({
  value,
  max,
  className = "bg-accent",
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-3 w-full rounded bg-border" aria-hidden>
      <div className={`h-3 rounded ${className}`} style={{ width: `${value > 0 ? width : 0}%` }} />
    </div>
  );
}

/** Funnel, abandoned carts, sales by governorate and by payment method: the "what happens around the sale" cards. */
export function EngagementCards({ qs }: { qs: string }) {
  const t = useTranslations("Admin.analytics");
  const tStage = useTranslations("Admin.analytics.funnel.stages");
  const tGov = useTranslations("Common.governorates");
  const tMethod = useTranslations("Common.paymentMethod");
  const f = useFormatter();

  const funnel = useApi<Funnel>("funnel", qs);
  const abandoned = useApi<Abandoned>("abandoned-carts", qs);
  const govs = useApi<Governorates>("governorates", qs);
  const payments = useApi<Payments>("payment-methods", qs);

  const first = funnel.data?.[0]?.sessions ?? 0;
  const last = funnel.data?.[funnel.data.length - 1]?.sessions ?? 0;
  const topGovs = (govs.data ?? []).slice(0, 10);
  const govMax = Math.max(0, ...topGovs.map((g) => g.salesCents));
  const paySales = (payments.data ?? []).reduce((n, p) => n + p.salesCents, 0);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t("funnel.title")} hint={t("funnel.hint")} q={funnel}>
          {first === 0 ? (
            <p className="py-10 text-center text-muted">{t("empty")}</p>
          ) : (
            <>
              <ol className="space-y-3">
                {funnel.data!.map((s, i) => {
                  const prev = i === 0 ? null : funnel.data![i - 1].sessions;
                  return (
                    <li key={s.stage}>
                      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <span className="font-medium">{tStage(s.stage)}</span>
                        <span>
                          {t("funnel.visits", { count: s.sessions })}
                          {prev !== null && prev > 0 && (
                            <span className="ms-2 text-muted">
                              ·{" "}
                              {t("funnel.ofPrevious", {
                                value: f.number(s.sessions / prev, "percent"),
                              })}
                            </span>
                          )}
                        </span>
                      </div>
                      <Bar value={s.sessions} max={first} />
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 text-sm text-muted">
                {t("funnel.overall", { value: f.number(last / first, "percent") })}
              </p>
            </>
          )}
        </Card>

        <Card
          title={t("abandoned.title")}
          hint={t("abandoned.hint", { minutes: abandoned.data?.idleMinutes ?? 0 })}
          q={abandoned}
        >
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">{t("abandoned.carts")}</dt>
              <dd className="mt-1 text-3xl font-semibold">
                {f.number(abandoned.data?.carts ?? 0, "integer")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">{t("abandoned.value")}</dt>
              <dd className="mt-1 text-3xl font-semibold">
                <bdi>{money(f, abandoned.data?.valueCents ?? 0)}</bdi>
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title={t("governorates.title")} hint={t("governorates.hint")} q={govs}>
          {topGovs.length === 0 ? (
            <p className="py-10 text-center text-muted">{t("empty")}</p>
          ) : (
            <ul className="space-y-3">
              {topGovs.map((g) => (
                <li key={g.governorate || "none"}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">
                      {isGovernorate(g.governorate)
                        ? tGov(g.governorate)
                        : t("governorates.unknown")}
                    </span>
                    <span>
                      <bdi>{money(f, g.salesCents)}</bdi>
                      <span className="ms-2 text-muted">
                        · {t("governorates.orders", { count: g.orders })}
                      </span>
                    </span>
                  </div>
                  <Bar value={g.salesCents} max={govMax} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("payments.title")} hint={t("payments.hint")} q={payments}>
          {paySales === 0 ? (
            <p className="py-10 text-center text-muted">{t("empty")}</p>
          ) : (
            <>
              <div
                className="flex h-4 w-full overflow-hidden rounded bg-border"
                role="img"
                aria-label={t("payments.title")}
              >
                {payments.data!.map((p, i) => (
                  <div
                    key={p.method}
                    style={{
                      width: `${(p.salesCents / paySales) * 100}%`,
                      background: `var(--series-${i + 1})`,
                    }}
                    className={i > 0 ? "border-s-2 border-card" : ""}
                  />
                ))}
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {payments.data!.map((p, i) => (
                  <li key={p.method} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-3 rounded-sm"
                        style={{ background: `var(--series-${i + 1})` }}
                      />
                      <span className="font-medium">{tMethod(p.method)}</span>
                    </span>
                    <span>
                      <bdi>{money(f, p.salesCents)}</bdi>
                      <span className="ms-2 text-muted">
                        ·{" "}
                        {t("payments.share", {
                          value: f.number(p.salesCents / paySales, "percent"),
                        })}{" "}
                        · {t("governorates.orders", { count: p.orders })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
