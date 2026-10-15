import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth-shell";
import { pinLocale } from "@/i18n/server";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/forgot-password">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.forgot" });
  return { title: t("title"), robots: { index: false } };
}

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/forgot-password">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.forgot" });
  return (
    <AuthShell locale={locale} title={t("title")}>
      <ForgotForm />
    </AuthShell>
  );
}
