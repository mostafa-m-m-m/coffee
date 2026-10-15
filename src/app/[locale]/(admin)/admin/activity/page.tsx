import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { pick } from "@/lib/i18n/localized";
import { money } from "@/lib/format";
import {
  ACTIVITY_KINDS,
  activityQuerySchema,
  listActors,
  listActivity,
  type ActivityEntry,
} from "@/lib/services/activity";

const input = inputVariants({ size: "sm" });

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/activity">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.activity" });
  return { title: t("title") };
}

async function Feed({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/admin/activity">["searchParams"];
}) {
  const t = await getTranslations("Admin.activity");
  const tStatus = await getTranslations("Common.status");
  const f = await getFormatter();
  const locale = await currentLocale();
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = activityQuerySchema.parse(flat);
  const [data, actors] = await Promise.all([listActivity(query), listActors()]);

  const href = (page: number) => {
    const q = new URLSearchParams();
    for (const k of ["actor", "kind", "from", "to"] as const) if (query[k]) q.set(k, query[k]!);
    if (page > 1) q.set("page", String(page));
    const s = q.toString();
    return `/admin/activity${s ? `?${s}` : ""}`;
  };

  const status = (v: unknown) => (typeof v === "string" ? tStatus(v as never) : "");
  const text = (e: ActivityEntry) => {
    const d = e.details as Record<string, unknown>;
    const key = `actions.${e.action}`;
    const known = t.has(key as never);
    const product = pick(e.subject.product, locale);
    const variant = pick(e.subject.variant, locale);
    return t(
      (known ? key : "actions.unknown") as never,
      {
        order: e.subject.orderNumber ?? "",
        from: e.action === "price_changed" ? money(f, Number(d.from ?? 0)) : status(d.from),
        to: e.action === "price_changed" ? money(f, Number(d.to ?? 0)) : status(d.to),
        product: [product, variant].filter(Boolean).join(" · "),
        change: Number(d.change ?? 0) > 0 ? `+${d.change}` : String(d.change ?? ""),
        label: d.name
          ? `${pick(d.name, locale)}${d.sku ? ` · ${d.sku}` : ""}`
          : (e.subject.label ?? ""),
        feeFrom: money(f, Number(d.feeFrom ?? 0)),
        feeTo: money(f, Number(d.feeTo ?? 0)),
        etaTo: Number(d.etaTo ?? 0),
      } as never,
    );
  };
  const link = (e: ActivityEntry) =>
    e.subject.orderId
      ? `/admin/orders/${e.subject.orderId}`
      : e.kind === "product" && e.subject.entityId
        ? `/admin/products/${e.subject.entityId}`
        : e.kind === "shipping"
          ? "/admin/shipping"
          : null;

  return (
    <>
      <form
        method="get"
        action={`/${locale}/admin/activity`}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="actor" className="text-xs text-muted">
            {t("filters.actor")}
          </label>
          <select id="actor" name="actor" defaultValue={query.actor ?? ""} className={input}>
            <option value="">{t("filters.allActors")}</option>
            <option value="system">{t("system")}</option>
            {actors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="kind" className="text-xs text-muted">
            {t("filters.kind")}
          </label>
          <select id="kind" name="kind" defaultValue={query.kind ?? ""} className={input}>
            <option value="">{t("filters.allKinds")}</option>
            {ACTIVITY_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kinds.${k}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs text-muted">
            {t("filters.from")}
          </label>
          <input id="from" name="from" type="date" defaultValue={query.from} className={input} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs text-muted">
            {t("filters.to")}
          </label>
          <input id="to" name="to" type="date" defaultValue={query.to} className={input} />
        </div>
        <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
          {t("filters.apply")}
        </button>
        <Link
          href="/admin/activity"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          {t("filters.clear")}
        </Link>
      </form>

      {data.total === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-muted">{t("empty")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-background">
                <tr>
                  {(["time", "who", "what"] as const).map((c) => (
                    <th key={c} scope="col" className="p-3 text-start font-medium">
                      {t(`columns.${c}`)}
                    </th>
                  ))}
                  <th scope="col" className="p-3">
                    <span className="sr-only">{t("columns.link")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => {
                  const to = link(e);
                  return (
                    <tr key={`${e.kind}-${e.id}`} className="border-t border-border">
                      <td className="p-3 whitespace-nowrap">
                        {f.dateTime(new Date(e.at), "date")} {f.dateTime(new Date(e.at), "time")}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span
                            aria-hidden
                            className="grid size-6 place-items-center rounded-full bg-border text-xs font-medium"
                          >
                            {(e.actor?.name ?? t("system")).slice(0, 1).toUpperCase()}
                          </span>
                          {e.actor?.name ?? t("system")}
                        </span>
                      </td>
                      <td className="p-3">{text(e)}</td>
                      <td className="p-3 text-end">
                        {to && (
                          <Link href={to as never} className="underline">
                            {t("view")}
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <nav className="flex items-center justify-between text-sm" aria-label={t("title")}>
            <span>{t("summary", { total: data.total, page: data.page, pages: data.pages })}</span>
            <span className="flex gap-2">
              {data.page > 1 && (
                <Link
                  href={href(data.page - 1) as never}
                  className="rounded-md border border-border bg-card px-3 py-1.5"
                >
                  {t("previous")}
                </Link>
              )}
              {data.page < data.pages && (
                <Link
                  href={href(data.page + 1) as never}
                  className="rounded-md border border-border bg-card px-3 py-1.5"
                >
                  {t("next")}
                </Link>
              )}
            </span>
          </nav>
        </>
      )}
    </>
  );
}

export default async function ActivityPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/activity">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.activity" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <Feed searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
