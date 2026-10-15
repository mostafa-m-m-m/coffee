import { getTranslations } from "next-intl/server";
import { InfoPage } from "@/components/store/info-page";
import { pinLocale } from "@/i18n/server";
import { brand } from "@/lib/brand";

export async function generateMetadata({ params }: PageProps<"/[locale]/about">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.pages.about" });
  return { title: t("title", { brand: brand.name }), description: t("lead") };
}

export default async function Page({ params }: PageProps<"/[locale]/about">) {
  await pinLocale(params);
  return (
    <InfoPage
      namespace="about"
      sections={["store", "demo", "dashboard"]}
      cta={{ section: "dashboard", href: "/login" }}
    />
  );
}
