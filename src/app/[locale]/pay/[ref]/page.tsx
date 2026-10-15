import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Price } from "@/components/price";
import { Link, redirect } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { brand } from "@/lib/brand";
import { db } from "@/lib/db";
import { expireIfDue } from "@/lib/services/orders";
import { getSession } from "@/lib/session";
import { PayForm } from "./pay-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/pay/[ref]">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.pay" });
  return { title: t("title"), robots: { index: false } };
}

async function Pay({ params }: { params: PageProps<"/[locale]/pay/[ref]">["params"] }) {
  const { ref } = await params;
  const locale = await currentLocale();
  const t = await getTranslations("Store.pay");
  const session = await getSession();
  if (!session?.user) {
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/${locale}/pay/${ref}` } },
      locale,
    });
  }

  const found = await db.order.findUnique({
    where: { paymentRef: ref },
    select: { id: true, userId: true },
  });
  // a payment session belongs to the person who placed the order; anyone else sees "not found"
  if (!found || found.userId !== session.user.id) notFound();
  await expireIfDue(found.id); // time is up: cancel it before showing anything

  const order = await db.order.findUniqueOrThrow({
    where: { id: found.id },
    select: { id: true, orderNumber: true, status: true, totalCents: true, paymentExpiresAt: true },
  });
  if (order.status !== "PENDING" && order.status !== "CANCELLED") {
    return redirect({
      href: { pathname: "/checkout/success", query: { order: order.id } },
      locale,
    });
  }

  if (order.status === "CANCELLED") {
    return (
      <div
        role="alert"
        className="space-y-4 rounded-xl border border-border bg-card p-6 text-center"
      >
        <h1 className="text-xl font-bold">{t("expiredTitle")}</h1>
        <p className="text-muted">{t("expiredHint")}</p>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "primary", size: "md" }), "inline-block")}
        >
          {t("backToStore")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted">{brand.name}</p>
        <p className="mt-1 text-sm">{t("orderNumber", { number: String(order.orderNumber) })}</p>
        <p className="mt-3 text-3xl font-bold">
          <Price cents={order.totalCents} />
        </p>
      </section>
      <PayForm
        reference={ref}
        locale={locale}
        totalCents={order.totalCents}
        expiresAt={order.paymentExpiresAt?.toISOString() ?? null}
      />
    </div>
  );
}

// Every payment session is its own URL and always rendered on demand: there is no shell to prerender.
export const instant = false;

export default async function PayPage(props: PageProps<"/[locale]/pay/[ref]">) {
  await pinLocale(props.params);
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4 sm:justify-center">
      <header className="flex items-center justify-between">
        <span className="font-semibold tracking-tight">{brand.gatewayName}</span>
      </header>
      <PayBanner />
      <Suspense
        fallback={<div className="h-72 animate-pulse rounded-xl bg-border" aria-busy="true" />}
      >
        <Pay params={props.params} />
      </Suspense>
    </main>
  );
}

async function PayBanner() {
  const t = await getTranslations("Store.pay");
  return (
    <p
      role="note"
      className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-sm font-medium text-foreground"
    >
      {t("testBanner")}
    </p>
  );
}
