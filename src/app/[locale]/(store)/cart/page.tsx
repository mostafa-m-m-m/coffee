import { getTranslations } from "next-intl/server";
import { pinLocale } from "@/i18n/server";
import { CartView } from "./cart-view";

export async function generateMetadata({ params }: PageProps<"/[locale]/cart">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.cart" });
  return { title: t("title") };
}

export default async function CartPage({ params }: PageProps<"/[locale]/cart">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.cart" });
  return (
    <main className="pb-28 lg:pb-0">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <CartView />
    </main>
  );
}
