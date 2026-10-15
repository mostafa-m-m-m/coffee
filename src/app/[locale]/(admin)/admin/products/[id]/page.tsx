import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { currentLocale, pinLocale } from "@/i18n/server";
import { asLocalized, pick } from "@/lib/i18n/localized";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { listCategories } from "@/lib/services/products";
import { ProductForm } from "../product-form";
import { uploadsConfigured } from "@/lib/services/uploads";
import { InventoryAdjuster } from "./inventory-adjuster";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products/[id]">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.productForm" });
  return { title: t("editTitle") };
}

async function Edit({ params }: { params: PageProps<"/[locale]/admin/products/[id]">["params"] }) {
  const { id } = await params;
  const t = await getTranslations("Admin.productForm");
  const locale = await currentLocale();
  const [session, product, categories] = await Promise.all([
    getSession(),
    db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { priceCents: "asc" } } },
    }),
    listCategories(await currentLocale()),
  ]);
  if (!product) notFound();
  const readOnly = session?.user.role !== "ADMIN";

  return (
    <div className="space-y-8">
      <ProductForm
        readOnly={readOnly}
        uploadsEnabled={uploadsConfigured()}
        categories={categories}
        product={{
          id: product.id,
          name: asLocalized(product.name),
          slug: product.slug,
          description: asLocalized(product.description),
          origin: product.origin ?? "",
          roastLevel: product.roastLevel,
          tastingNotes: product.tastingNotes,
          categoryId: product.categoryId,
          images: product.images,
          isActive: product.isActive,
          variants: product.variants.map((v) => ({
            variantId: v.id,
            name: asLocalized(v.name),
            isArchived: v.isArchived,
            sku: v.sku,
            price: v.priceCents / 100,
            stock: v.stock,
            lowStockThreshold: v.lowStockThreshold,
          })),
        }}
      />
      {!readOnly && (
        <section aria-labelledby="inv" className="rounded-lg border border-border bg-card p-4">
          <h2 id="inv" className="mb-1 font-semibold">
            {t("inventoryTitle")}
          </h2>
          <p className="mb-4 text-sm text-muted">{t("inventoryHint")}</p>
          <ul className="space-y-3">
            {product.variants.map((v) => (
              <InventoryAdjuster
                key={v.id}
                variantId={v.id}
                name={pick(v.name, locale)}
                stock={v.stock}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default async function EditProductPage(props: PageProps<"/[locale]/admin/products/[id]">) {
  const locale = await pinLocale(props.params);
  const t = await getTranslations({ locale, namespace: "Admin.productForm" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <Edit params={props.params} />
      </Suspense>
    </main>
  );
}
