import { buttonVariants } from "@/components/ui/button";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import Image from "next/image";
import { Price } from "@/components/price";
import { Badge } from "@/components/ui/badge";
import { VisibilitySwitch } from "./visibility-switch";
import { Link } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { pick } from "@/lib/i18n/localized";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.products" });
  return { title: t("title") };
}

const FILTERS = ["all", "visible", "hidden"] as const;
type Filter = (typeof FILTERS)[number];

async function ProductsTable({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/admin/products">["searchParams"];
}) {
  const raw = (await searchParams).show;
  const show: Filter = FILTERS.find((x) => x === raw) ?? "all";
  const t = await getTranslations("Admin.products");
  const f = await getFormatter();
  const locale = await currentLocale();
  const [session, products] = await Promise.all([
    getSession(),
    db.product.findMany({
      where: show === "all" ? {} : { isActive: show === "visible" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        images: true,
        isActive: true,
        category: { select: { name: true } },
        variants: { select: { priceCents: true, stock: true, lowStockThreshold: true } },
      },
    }),
  ]);
  const canEdit = session?.user.role === "ADMIN";

  if (products.length === 0 && show === "all") {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="mb-3">{t("empty")}</p>
        {canEdit && (
          <Link
            href="/admin/products/new"
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            {t("addFirst")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <nav aria-label={t("filterLabel")} className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/products" : `/admin/products?show=${f}`}
            aria-current={f === show ? "page" : undefined}
            className={`rounded-full border px-3 py-1 ${f === show ? "border-accent bg-accent text-accent-fg" : "border-border bg-card"}`}
          >
            {t(`filters.${f}`)}
          </Link>
        ))}
      </nav>
      {products.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-muted">{t("noMatch")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("title")}</caption>
            <thead className="bg-border/40">
              <tr>
                <th scope="col" className="p-3 text-start">
                  {t("columns.product")}
                </th>
                <th scope="col" className="hidden p-3 text-start md:table-cell">
                  {t("columns.category")}
                </th>
                <th scope="col" className="p-3 text-start">
                  {t("columns.price")}
                </th>
                <th scope="col" className="p-3 text-start">
                  {t("columns.stock")}
                </th>
                <th scope="col" className="p-3 text-start">
                  {t("columns.status")}
                </th>
                <th scope="col" className="p-3">
                  <span className="sr-only">{t("columns.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const prices = p.variants.map((v) => v.priceCents);
                const stock = p.variants.reduce((n, v) => n + v.stock, 0);
                const low = p.variants.some((v) => v.stock <= v.lowStockThreshold);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium">
                      <div className="flex items-center gap-3">
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-border">
                          {p.images[0] && (
                            <Image
                              src={p.images[0]}
                              alt=""
                              fill
                              unoptimized
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </span>
                        <span>
                          <Link href={`/admin/products/${p.id}`} className="hover:underline">
                            {pick(p.name, locale)}
                          </Link>
                          <span className="block text-xs text-muted">
                            {t("variantCount", { count: p.variants.length })}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="hidden p-3 md:table-cell">{pick(p.category.name, locale)}</td>
                    <td className="p-3">
                      {Math.min(...prices) === Math.max(...prices) ? (
                        <Price cents={prices[0]} />
                      ) : (
                        <bdi dir="ltr">
                          <Price cents={Math.min(...prices)} /> –{" "}
                          <Price cents={Math.max(...prices)} />
                        </bdi>
                      )}
                    </td>
                    <td className="p-3">
                      {f.number(stock, "integer")}
                      {low && (
                        <Badge tone="warning" icon="warning" className="ms-2">
                          {t("lowStock")}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {canEdit ? (
                        <VisibilitySwitch
                          id={p.id}
                          name={pick(p.name, locale)}
                          active={p.isActive}
                        />
                      ) : (
                        <Badge tone={p.isActive ? "success" : "neutral"}>
                          {p.isActive ? t("visible") : t("hidden")}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-end">
                      <Link href={`/admin/products/${p.id}`} className="underline">
                        {canEdit ? t("edit") : t("view")}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function NewButton() {
  const session = await getSession();
  const t = await getTranslations("Admin.products");
  if (session?.user.role !== "ADMIN") return null;
  return (
    <Link href="/admin/products/new" className={buttonVariants({ variant: "primary", size: "md" })}>
      {t("new")}
    </Link>
  );
}

export default async function ProductsPage({
  params,
  searchParams,
}: PageProps<"/[locale]/admin/products">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.products" });
  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Suspense>
          <NewButton />
        </Suspense>
      </div>
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <ProductsTable searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
