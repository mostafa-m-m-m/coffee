import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { pinLocale } from "@/i18n/server";
import { VerifyStatus } from "./verify-status";

export async function generateMetadata({ params }: PageProps<"/[locale]/verify-email">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.verify" });
  return { title: t("title"), robots: { index: false } };
}

export default async function VerifyEmailPage({ params }: PageProps<"/[locale]/verify-email">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.verify" });
  return (
    <AuthShell locale={locale} title={t("title")}>
      <Suspense>
        <VerifyStatus />
      </Suspense>
    </AuthShell>
  );
}
