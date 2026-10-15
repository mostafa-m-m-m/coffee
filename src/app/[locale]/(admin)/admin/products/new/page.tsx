import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { getSession } from "@/lib/session";
import { listCategories } from "@/lib/services/products";
import { ProductForm } from "../product-form";
import { uploadsConfigured } from "@/lib/services/uploads";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/products/new">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.productForm" });
  return { title: t("newTitle") };
}

async function New() {
  const session = await getSession();
  if (session?.user.role !== "ADMIN") {
    return redirect({ href: "/admin/products", locale: await getLocale() });
  }
  const categories = await listCategories(await currentLocale());
  return <ProductForm categories={categories} uploadsEnabled={uploadsConfigured()} />;
}

export default async function NewProductPage({
  params,
}: PageProps<"/[locale]/admin/products/new">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.productForm" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <New />
      </Suspense>
    </main>
  );
}
