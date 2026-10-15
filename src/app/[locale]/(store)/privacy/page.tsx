import { getTranslations } from "next-intl/server";
import { InfoPage } from "@/components/store/info-page";
import { pinLocale } from "@/i18n/server";
import { brand } from "@/lib/brand";

export async function generateMetadata({ params }: PageProps<"/[locale]/privacy">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.pages.privacy" });
  return { title: t("title", { brand: brand.name }), description: t("updated") };
}

export default async function Page({ params }: PageProps<"/[locale]/privacy">) {
  await pinLocale(params);
  return <InfoPage namespace="privacy" sections={["data", "payments", "usage", "email"]} />;
}
