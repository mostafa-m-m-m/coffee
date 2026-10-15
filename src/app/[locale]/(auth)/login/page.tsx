import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthSplit } from "@/components/auth-split";
import { pinLocale } from "@/i18n/server";
import { hasGoogleLogin } from "@/lib/env";
import { LoginForm } from "./login-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.login" });
  return { title: t("title") };
}

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Auth.login" });
  return (
    <AuthSplit locale={locale} active="login" title={t("title")}>
      <Suspense>
        <LoginForm googleEnabled={hasGoogleLogin()} />
      </Suspense>
    </AuthSplit>
  );
}
