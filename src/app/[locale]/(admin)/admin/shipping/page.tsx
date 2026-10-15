import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pinLocale } from "@/i18n/server";
import { db } from "@/lib/db";
import { money } from "@/lib/format";
import { pick } from "@/lib/i18n/localized";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/config";
import { getSession } from "@/lib/session";
import { ZoneEditor } from "./zone-editor";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/shipping">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.shipping" });
  return { title: t("title") };
}

async function ZoneTable({ locale }: { locale: "ar" | "en" }) {
  const t = await getTranslations("Admin.shipping");
  const tg = await getTranslations("Common.governorates");
  const f = await getFormatter();
  const [session, zones] = await Promise.all([
    getSession(),
    db.shippingZone.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const canEdit = session?.user.role === "ADMIN";
  if (!zones.length)
    return <p className="rounded-lg border border-border bg-card p-6 text-muted">{t("empty")}</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-background">
          <tr>
            {(["zone", "fee", "eta", "governorates"] as const).map((c) => (
              <th key={c} scope="col" className="p-3 text-start font-medium">
                {t(`columns.${c}`)}
              </th>
            ))}
            {canEdit && (
              <th scope="col" className="p-3">
                <span className="sr-only">{t("columns.actions")}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => (
            <tr key={z.id} className="border-t border-border align-top">
              <td className="p-3 font-medium">{pick(z.name, locale)}</td>
              <td className="p-3">{money(f, z.feeCents)}</td>
              <td className="p-3">{t("eta", { days: z.etaDays })}</td>
              <td className="p-3">
                <ul className="flex flex-wrap gap-1">
                  {z.governorates.map((g) => (
                    <li
                      key={g}
                      className="rounded-full border border-border px-2 py-0.5 text-xs text-muted"
                    >
                      {tg(g as never)}
                    </li>
                  ))}
                </ul>
              </td>
              {canEdit && (
                <td className="p-3 text-end">
                  <ZoneEditor
                    id={z.id}
                    name={pick(z.name, locale)}
                    feeCents={z.feeCents}
                    etaDays={z.etaDays}
                    governorates={z.governorates}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function FreeNote() {
  const t = await getTranslations("Admin.shipping");
  const f = await getFormatter();
  return (
    <p className="rounded-md border border-border bg-card px-3 py-2 text-sm">
      {t("freeNote", { amount: money(f, FREE_SHIPPING_THRESHOLD_CENTS) })}
    </p>
  );
}

export default async function ShippingPage({ params }: PageProps<"/[locale]/admin/shipping">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.shipping" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <FreeNote />
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <ZoneTable locale={locale} />
      </Suspense>
    </main>
  );
}
