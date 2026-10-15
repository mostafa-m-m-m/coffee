import { getTranslations } from "next-intl/server";
import { SubscribeForm } from "@/components/store/subscribe-form";
import { pinLocale } from "@/i18n/server";

export async function generateMetadata({ params }: PageProps<"/[locale]/subscriptions">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.pages.subscriptions" });
  return { title: t("title"), description: t("lead") };
}

export default async function SubscriptionsPage({ params }: PageProps<"/[locale]/subscriptions">) {
  await pinLocale(params);
  const t = await getTranslations("Store.pages.subscriptions");
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-start gap-4 py-8">
      <span className="rounded-full border border-border bg-card px-3 py-1 text-sm text-accent">
        {t("soon")}
      </span>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-lg text-muted">{t("lead")}</p>
      <p>{t("text")}</p>
      <SubscribeForm source="subscription-interest" />
    </main>
  );
}
