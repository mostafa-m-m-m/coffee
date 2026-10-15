"use client";

import { buttonVariants } from "@/components/ui/button";
import { useFormatter, useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { PaymentBadge, StatusBadge } from "@/components/patterns/status-badge";
import { Price } from "@/components/price";
import { Sheet } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { isGovernorate } from "@/lib/geo";

type Detail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  createdAt: string;
  orderCount: number;
  spentCents: number;
  addresses: {
    id: string;
    governorate: string;
    area: string;
    street: string;
    building: string;
    isDefault: boolean;
  }[];
  orders: {
    id: string;
    orderNumber: number;
    status: string;
    paymentStatus: string;
    totalCents: number;
    createdAt: string;
  }[];
};

/** Side panel with one customer's details and order history. Esc or the backdrop closes it. */
export function CustomerPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const t = useTranslations("Admin.customers.panel");
  const tc = useTranslations("Common");
  const tg = useTranslations("Common.governorates");
  const f = useFormatter();
  const { data, isLoading, isError } = useQuery<Detail>({
    queryKey: ["admin-customer", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/customers/${id}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  return (
    <Sheet open onClose={onClose} title={t("title")} closeLabel={tc("close")}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{data?.name ?? t("title")}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={tc("close")}
          className={buttonVariants({ variant: "secondary", size: "icon" })}
        >
          ✕
        </button>
      </div>

      {isLoading && <div className="h-40 animate-pulse rounded bg-border" aria-busy="true" />}
      {isError && <p role="alert">{t("loadError")}</p>}
      {data && (
        <>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="col-span-2">
              <dt className="text-muted">{t("email")}</dt>
              <dd dir="ltr" className="text-start">
                {data.email}{" "}
                {!data.emailVerified && <span className="text-muted">({t("unverified")})</span>}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t("phone")}</dt>
              <dd dir="ltr" className="text-start">
                {data.phone ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{t("joined")}</dt>
              <dd>{f.dateTime(new Date(data.createdAt), "date")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("orders")}</dt>
              <dd className="font-mono">{f.number(data.orderCount, "integer")}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("spent")}</dt>
              <dd className="font-mono">
                <Price cents={data.spentCents} />
              </dd>
            </div>
          </dl>

          <section aria-labelledby="cust-addr">
            <h3 id="cust-addr" className="mb-2 font-medium">
              {t("addresses")}
            </h3>
            {data.addresses.length === 0 ? (
              <p className="text-sm text-muted">{t("noAddresses")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.addresses.map((a) => (
                  <li key={a.id} className="rounded-md border border-border p-2">
                    {isGovernorate(a.governorate) ? tg(a.governorate) : a.governorate} — {a.area},{" "}
                    {a.street}, {a.building}
                    {a.isDefault && (
                      <span className="ms-2 text-xs text-muted">({t("default")})</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="cust-orders">
            <h3 id="cust-orders" className="mb-2 font-medium">
              {t("history")}
            </h3>
            {data.orders.length === 0 ? (
              <p className="text-sm text-muted">{t("noOrders")}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border text-sm">
                {data.orders.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-2 p-2">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono underline">
                      #{o.orderNumber}
                    </Link>
                    <span className="text-muted">{f.dateTime(new Date(o.createdAt), "date")}</span>
                    <StatusBadge status={o.status} />
                    <PaymentBadge status={o.paymentStatus} />
                    <Price cents={o.totalCents} className="ms-auto font-mono" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Sheet>
  );
}
