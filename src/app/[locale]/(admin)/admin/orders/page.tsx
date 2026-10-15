import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pinLocale } from "@/i18n/server";
import { getSession } from "@/lib/session";
import { OrdersTable } from "./orders-table";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/orders">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.orders" });
  return { title: t("title") };
}

async function Table() {
  const session = await getSession();
  return <OrdersTable canEdit={session?.user.role === "ADMIN"} />;
}

export default async function OrdersPage({ params }: PageProps<"/[locale]/admin/orders">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.orders" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      {/* useSearchParams needs a Suspense boundary */}
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <Table />
      </Suspense>
    </main>
  );
}
