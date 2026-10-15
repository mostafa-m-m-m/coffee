import { getTranslations } from "next-intl/server";
import { AuthSplit } from "@/components/auth-split";
import { pinLocale } from "@/i18n/server";
import { RegisterForm } from "./register-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/register">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.register" });
  return { title: t("title") };
}

export default async function RegisterPage({ params }: PageProps<"/[locale]/register">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.register" });
  return (
    <AuthSplit locale={locale} active="register" title={t("title")}>
      <RegisterForm />
    </AuthSplit>
  );
}
