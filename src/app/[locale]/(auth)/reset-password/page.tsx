import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { pinLocale } from "@/i18n/server";
import { ResetForm } from "./reset-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/reset-password">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.reset" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ResetPasswordPage({ params }: PageProps<"/[locale]/reset-password">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.reset" });
  return (
    <AuthShell locale={locale} title={t("title")}>
      <Suspense>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
