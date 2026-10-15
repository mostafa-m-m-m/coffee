import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";
import { pinLocale } from "@/i18n/server";
import { db } from "@/lib/db";
import { EMAIL_STATUS_STYLE } from "./status-style";

const PAGE_SIZE = 25;

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/emails">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.emails" });
  return { title: t("title") };
}

async function EmailTable({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/admin/emails">["searchParams"];
}) {
  const t = await getTranslations("Admin.emails");
  const f = await getFormatter();
  const sp = await searchParams;
  const raw = Number(sp.page);
  const picked = typeof sp.id === "string" ? sp.id : undefined;
  const requested = Number.isInteger(raw) && raw > 0 ? raw : 1;

  const [total, rows] = await Promise.all([
    db.emailLog.count(),
    db.emailLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (requested - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        to: true,
        type: true,
        status: true,
        createdAt: true,
        order: { select: { id: true, orderNumber: true } },
      },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, pages);
  const selectedId = rows.find((x) => x.id === picked)?.id ?? rows[0]?.id;
  const known = <K extends string>(map: Record<K, unknown>, key: string): key is K => key in map;

  if (total === 0)
    return <p className="rounded-lg border border-border bg-card p-6 text-muted">{t("empty")}</p>;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-background text-start">
              <tr>
                {(["time", "type", "to", "status", "order"] as const).map((c) => (
                  <th key={c} scope="col" className="p-3 text-start font-medium">
                    {t(`columns.${c}`)}
                  </th>
                ))}
                <th scope="col" className="p-3">
                  <span className="sr-only">{t("preview")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className={`border-t border-border ${r.id === selectedId ? "bg-border/40" : ""}`}
                >
                  <td className="p-3">
                    {f.dateTime(r.createdAt, "date")} {f.dateTime(r.createdAt, "time")}
                  </td>
                  <td className="p-3">
                    {t.has(`types.${r.type}` as never) ? t(`types.${r.type}` as never) : r.type}
                  </td>
                  <td className="p-3" dir="ltr">
                    {r.to}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs ${known(EMAIL_STATUS_STYLE, r.status) ? EMAIL_STATUS_STYLE[r.status] : ""}`}
                    >
                      {known(EMAIL_STATUS_STYLE, r.status) ? t(`statuses.${r.status}`) : r.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.order ? (
                      <Link href={`/admin/orders/${r.order.id}`} className="underline">
                        #{r.order.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-end">
                    <Link
                      href={`/admin/emails?id=${r.id}${page > 1 ? `&page=${page}` : ""}`}
                      aria-current={r.id === selectedId ? "true" : undefined}
                      className="underline"
                    >
                      {t("preview")}
                    </Link>
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
                href={`/admin/emails?page=${page - 1}`}
                className="rounded-md border border-border bg-card px-3 py-1.5"
              >
                {t("previous")}
              </Link>
            )}
            {page < pages && (
              <Link
                href={`/admin/emails?page=${page + 1}`}
                className="rounded-md border border-border bg-card px-3 py-1.5"
              >
                {t("next")}
              </Link>
            )}
          </span>
        </nav>
      </div>
      <aside aria-label={t("previewPane")} className="min-w-0">
        {selectedId && (
          <Suspense fallback={<div className="h-[40rem] animate-pulse rounded-lg bg-border" />}>
            <EmailPane id={selectedId} />
          </Suspense>
        )}
      </aside>
    </div>
  );
}

/** The selected email as it looks in an inbox. The stored HTML is sandboxed: no scripts can reach the dashboard. */
async function EmailPane({ id }: { id: string }) {
  const t = await getTranslations("Admin.emails");
  const email = await db.emailLog.findUnique({
    where: { id },
    select: { to: true, type: true, html: true },
  });
  if (!email) return null;
  return (
    <div className="sticky top-4 space-y-2">
      <p className="text-sm text-muted" dir="ltr">
        {email.to}
      </p>
      <iframe
        title={t("frameLabel")}
        sandbox=""
        srcDoc={email.html}
        className="h-[40rem] w-full rounded-lg border border-border bg-white"
      />
    </div>
  );
}

export default async function EmailsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/emails">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.emails" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <EmailTable searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
