import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { pinLocale } from "@/i18n/server";
import { AnalyticsDashboard } from "./analytics-dashboard";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin/analytics">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.analytics" });
  return { title: t("title") };
}

export default async function AnalyticsPage({ params }: PageProps<"/[locale]/admin/analytics">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Admin.analytics" });
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <AnalyticsDashboard />
      </Suspense>
    </main>
  );
}
