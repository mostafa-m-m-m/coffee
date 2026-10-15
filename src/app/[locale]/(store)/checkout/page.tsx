import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { redirect } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { pick } from "@/lib/i18n/localized";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { isGovernorate } from "@/lib/geo";
import { TrackEvent } from "@/components/store/track-event";
import { CheckoutForm } from "./checkout-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/checkout">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.checkout" });
  return { title: t("title") };
}

async function Checkout() {
  const session = await getSession();
  const locale = await currentLocale();
  const t = await getTranslations("Store.checkout");
  if (!session?.user) {
    redirect({
      href: { pathname: "/login", query: { callbackUrl: `/${locale}/checkout` } },
      locale,
    });
    return null;
  }

  if (session.user.role === "VIEWER") {
    return (
      <p role="alert" className="rounded-lg border border-border p-6">
        {t("viewerNotice")}
      </p>
    );
  }

  const [address, user, zones] = await Promise.all([
    db.address.findFirst({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    }),
    db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { name: true, phone: true },
    }),
    db.shippingZone.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <TrackEvent type="CHECKOUT_START" />
      <CheckoutForm
        zones={zones.map((z) => ({
          id: z.id,
          name: pick(z.name, locale),
          governorates: z.governorates,
          feeCents: z.feeCents,
          etaDays: z.etaDays,
        }))}
        defaults={{
          fullName: address?.fullName ?? user.name,
          phone: address?.phone ?? user.phone ?? "",
          // an empty governorate is a deliberate "not chosen yet"; the form asks for it
          governorate: (isGovernorate(address?.governorate) ? address.governorate : "") as never,
          area: address?.area ?? "",
          street: address?.street ?? "",
          building: address?.building ?? "",
          notes: address?.notes ?? "",
        }}
      />
    </>
  );
}

export default async function CheckoutPage({ params }: PageProps<"/[locale]/checkout">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.checkout" });
  return (
    <main className="pb-24 lg:pb-0">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <Checkout />
      </Suspense>
    </main>
  );
}
