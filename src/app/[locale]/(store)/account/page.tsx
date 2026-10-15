import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Price } from "@/components/price";
import { redirect } from "@/i18n/navigation";
import { pinLocale } from "@/i18n/server";
import { PaymentBadge, StatusBadge } from "@/components/patterns/status-badge";
import { isGovernorate } from "@/lib/geo";
import { hasInvoice } from "@/lib/invoice-rules";
import { pick } from "@/lib/i18n/localized";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { logoutAction } from "../../(auth)/actions";
import { AddressForm, DeleteAddressButton, ProfileForm } from "./forms";

export async function generateMetadata({ params }: PageProps<"/[locale]/account">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.account" });
  return { title: t("title") };
}

const STEPS = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"] as const;

async function Account() {
  const session = await getSession();
  const locale = await getLocale();
  const t = await getTranslations("Store.account");
  const tStatus = await getTranslations("Common.status");
  const tInvoice = await getTranslations("Common.invoice");
  const tGov = await getTranslations("Common.governorates");
  const f = await getFormatter();
  if (!session?.user) {
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/${locale}/account` } },
      locale,
    });
  }
  const userId = session.user.id;

  const [user, orders, addresses] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    }),
    db.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        items: { select: { productName: true, variantName: true, quantity: true } },
        events: {
          select: { type: true, toStatus: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.address.findMany({ where: { userId }, orderBy: { id: "asc" } }),
  ]);

  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <nav aria-label={t("menu.label")} className="md:sticky md:top-24 md:self-start">
        <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
          {(["orders", "addresses", "profile", "language"] as const).map((k) => (
            <li key={k}>
              <a href={`#${k}`} className="block rounded-md px-3 py-2 text-sm hover:bg-border">
                {t(`menu.${k}`)}
              </a>
            </li>
          ))}
          <li>
            <form action={logoutAction}>
              <button
                type="submit"
                className="block w-full rounded-md px-3 py-2 text-start text-sm text-danger hover:bg-border"
              >
                {t("menu.logout")}
              </button>
            </form>
          </li>
        </ul>
      </nav>
      <div className="space-y-10">
        <section id="orders" aria-labelledby="orders-h" className="scroll-mt-24">
          <h2 id="orders-h" className="mb-3 text-xl font-semibold">
            {t("orders")}
          </h2>
          {orders.length === 0 ? (
            <p className="text-muted">{t("noOrders")}</p>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => {
                const reached = new Map(
                  o.events
                    .filter((e) => e.toStatus)
                    .map((e) => [e.toStatus as string, e.createdAt]),
                );
                const steps =
                  o.status === "CANCELLED" ? (["PENDING", "CANCELLED"] as const) : STEPS;
                return (
                  <li key={o.id} className="rounded-lg border border-border bg-card">
                    <details className="group">
                      <summary className="flex cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 p-4">
                        <span className="font-mono font-medium">#{o.orderNumber}</span>
                        <span className="text-sm text-muted">
                          {f.dateTime(o.createdAt, "date")}
                        </span>
                        <span className="text-sm text-muted">
                          {t("itemsCount", { count: o.items.reduce((n, i) => n + i.quantity, 0) })}
                        </span>
                        <StatusBadge status={o.status} />
                        <PaymentBadge status={o.paymentStatus} />
                        <Price cents={o.totalCents} className="ms-auto font-mono font-medium" />
                        <span
                          aria-hidden
                          className="text-muted transition group-open:rotate-90 rtl:-scale-x-100"
                        >
                          ›
                        </span>
                      </summary>
                      <div className="space-y-4 border-t border-border p-4">
                        <ul className="space-y-1 text-sm">
                          {o.items.map((i, n) => (
                            <li key={n}>
                              {pick(i.productName, locale)} ({pick(i.variantName, locale)}) ×
                              {i.quantity}
                            </li>
                          ))}
                        </ul>
                        <ol
                          aria-label={t("progress")}
                          className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
                        >
                          {steps.map((st) => {
                            const at =
                              reached.get(st) ?? (st === "PENDING" ? o.createdAt : undefined);
                            return (
                              <li key={st} className={at ? "" : "text-muted"}>
                                <span aria-hidden>{at ? "●" : "○"}</span> {tStatus(st)}
                                {at && (
                                  <span className="ms-1 text-xs text-muted">
                                    {f.dateTime(at, "date")}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                        {hasInvoice(o) && (
                          <a
                            href={`/api/orders/${o.id}/invoice`}
                            target="_blank"
                            rel="noopener"
                            className="inline-block text-sm underline"
                          >
                            {tInvoice("download")}
                          </a>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section id="addresses" aria-labelledby="addresses-h" className="scroll-mt-24">
          <h2 id="addresses-h" className="mb-3 text-xl font-semibold">
            {t("addresses")}
          </h2>
          {addresses.length > 0 && (
            <ul className="mb-6 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <li
                  key={a.id}
                  className="space-y-1 rounded-lg border border-border bg-card p-4 text-sm"
                >
                  <p className="font-medium">
                    {a.fullName}{" "}
                    {a.isDefault && <span className="text-xs text-muted">({t("default")})</span>}
                  </p>
                  <p>{[a.building, a.street, a.area].join(t("listSeparator"))}</p>
                  <p>
                    {isGovernorate(a.governorate) ? tGov(a.governorate) : a.governorate} —{" "}
                    <bdi dir="ltr">{a.phone}</bdi>
                  </p>
                  <DeleteAddressButton id={a.id} />
                </li>
              ))}
            </ul>
          )}
          <AddressForm />
        </section>
        <section id="profile" aria-labelledby="profile-h" className="scroll-mt-24">
          <h2 id="profile-h" className="mb-3 text-xl font-semibold">
            {t("profile")}
          </h2>
          <ProfileForm name={user.name} email={user.email} phone={user.phone ?? ""} />
        </section>

        <section id="language" aria-labelledby="language-h" className="scroll-mt-24">
          <h2 id="language-h" className="mb-3 text-xl font-semibold">
            {t("menu.language")}
          </h2>
          <LocaleSwitcher />
        </section>
      </div>
    </div>
  );
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.account" });
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <Suspense
        fallback={<div className="h-48 animate-pulse rounded-lg bg-border" aria-busy="true" />}
      >
        <Account />
      </Suspense>
    </main>
  );
}
