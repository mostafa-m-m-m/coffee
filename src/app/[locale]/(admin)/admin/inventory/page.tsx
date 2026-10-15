import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { db } from "@/lib/db";
import { pick } from "@/lib/i18n/localized";
import type { InventoryReason } from "@/generated/prisma/client";

const PAGE_SIZE = 25;
const REASONS: InventoryReason[] = ["SALE", "CANCELLATION", "RESTOCK", "MANUAL_ADJUSTMENT"];
const OPENING_NOTE = "Initial stock";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/inventory">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.inventoryHistory" });
  return { title: t("title") };
}

async function MovementTable({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/admin/inventory">["searchParams"];
}) {
  const t = await getTranslations("Admin.inventoryHistory");
  const f = await getFormatter();
  const locale = await currentLocale();
  const sp = await searchParams;
  const raw = Number(sp.page);
  const requested = Number.isInteger(raw) && raw > 0 ? raw : 1;
  const reason = REASONS.find((r) => r === sp.reason);
  const where = reason ? { reason } : {};
  const href = (page: number) => {
    const q = new URLSearchParams();
    if (reason) q.set("reason", reason);
    if (page > 1) q.set("page", String(page));
    const s = q.toString();
    return `/admin/inventory${s ? `?${s}` : ""}`;
  };

  const [total, rows] = await Promise.all([
    db.inventoryLog.count({ where }),
    db.inventoryLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (requested - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        change: true,
        reason: true,
        note: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true } },
        variant: { select: { sku: true, name: true, product: { select: { name: true } } } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, pages);

  return (
    <>
      <nav aria-label={t("filterLabel")} className="flex flex-wrap gap-2 text-sm">
        {[undefined, ...REASONS].map((r) => (
          <Link
            key={r ?? "all"}
            href={r ? `/admin/inventory?reason=${r}` : "/admin/inventory"}
            aria-current={r === reason ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${r === reason ? "border-accent bg-accent text-accent-fg" : "border-border bg-card"}`}
          >
            {r ? t(`reasons.${r}`) : t("allReasons")}
          </Link>
        ))}
      </nav>

      {total === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-muted">{t("empty")}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-background">
                <tr>
                  {(["time", "product", "change", "reason", "order", "note"] as const).map((c) => (
                    <th key={c} scope="col" className="p-3 text-start font-medium">
                      {t(`columns.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">
                      {f.dateTime(r.createdAt, "date")} {f.dateTime(r.createdAt, "time")}
                    </td>
                    <td className="p-3">
                      {pick(r.variant.product.name, locale)} · {pick(r.variant.name, locale)}
                      <div className="font-mono text-xs text-muted" dir="ltr">
                        {r.variant.sku}
                      </div>
                    </td>
                    <td
                      className={`p-3 font-mono ${r.change > 0 ? "text-success" : "text-danger"}`}
                      dir="ltr"
                    >
                      {r.change > 0 ? `+${r.change}` : r.change}
                    </td>
                    <td className="p-3">{t(`reasons.${r.reason}`)}</td>
                    <td className="p-3">
                      {r.order ? (
                        <Link href={`/admin/orders/${r.order.id}`} className="underline">
                          #{r.order.orderNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3 text-muted">
                      {r.note === OPENING_NOTE ? t("openingStock") : (r.note ?? "—")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="flex items-center justify-between text-sm" aria-label={t("title")}>
            <span>{t("summary", { total, page, pages })}</span>
            <span className="flex gap-2">
              {page > 1 && (
                <Link
                  href={href(page - 1)}
                  className="rounded-md border border-border bg-card px-3 py-1.5"
                >
                  {t("previous")}
                </Link>
              )}
              {page < pages && (
                <Link
                  href={href(page + 1)}
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

export default async function InventoryPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/inventory">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.inventoryHistory" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <MovementTable searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
