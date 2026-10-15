"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useFormatter, useTranslations } from "next-intl";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Price } from "@/components/price";
import { useDebouncedParam } from "@/hooks/use-debounced-param";
import { useUrlState } from "@/hooks/use-url-state";
import { useState } from "react";
import { isGovernorate } from "@/lib/geo";
import { CustomerPanel } from "./customer-panel";

type Customer = {
  id: string;
  name: string;
  email: string;
  joined: string;
  orders: number;
  spentCents: number;
  lastPurchase: string | null;
  governorate: string | null;
};
type Result = { items: Customer[]; total: number; page: number; pageCount: number };

const COLS = ["name", "governorate", "orders", "spent", "last", "joined"] as const;

const input = inputVariants({ size: "sm" });

export function CustomersTable() {
  const t = useTranslations("Admin.customers");
  const tc = useTranslations("Common");
  const f = useFormatter();
  const tg = useTranslations("Common.governorates");
  const [openId, setOpenId] = useState<string | null>(null);
  const { params, patch, clear: clearUrl } = useUrlState();
  const qs = params.toString();
  const sort = params.get("sort") ?? "spent";
  const dir = params.get("dir") ?? "desc";

  const search = useDebouncedParam(params.get("q") ?? "", (q) => patch({ q }));
  const clear = (keep: string[]) => {
    search.reset();
    clearUrl(keep);
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery<Result>({
    queryKey: ["admin-customers", qs],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await fetch(`/api/admin/customers?${qs}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  function toggleSort(id: string) {
    patch({ sort: id, dir: sort === id && dir === "desc" ? "asc" : "desc" });
  }

  return (
    <div className="space-y-4">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="flex items-end gap-3 rounded-lg border border-border bg-card p-3"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="cq" className="text-xs text-muted">
            {t("search")}
          </label>
          <input
            id="cq"
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className={`${input} w-64`}
          />
        </div>
        {params.has("q") && (
          <button
            type="button"
            onClick={() => clear(["sort", "dir"])}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {t("clear")}
          </button>
        )}
      </form>

      <div
        className="overflow-x-auto rounded-lg border border-border bg-card"
        aria-busy={isFetching}
      >
        <table className="w-full text-sm">
          <caption className="sr-only">{t("title")}</caption>
          <thead className="bg-border/40">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c}
                  scope="col"
                  aria-sort={
                    c !== "governorate" && sort === c
                      ? dir === "desc"
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                  className={`p-3 text-start font-medium ${c === "joined" ? "hidden lg:table-cell" : ""}`}
                >
                  {c === "governorate" ? (
                    t("columns.governorate")
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleSort(c)}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {t(`columns.${c}`)}
                      <span aria-hidden>{sort === c ? (dir === "desc" ? "▼" : "▲") : "↕"}</span>
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={isFetching && !isLoading ? "opacity-60" : ""}>
            {isLoading &&
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={COLS.length} className="p-3">
                    <div className="h-5 animate-pulse rounded bg-border" />
                  </td>
                </tr>
              ))}
            {data?.items.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-border/30">
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => setOpenId(c.id)}
                    aria-haspopup="dialog"
                    className="text-start font-medium underline-offset-2 hover:underline"
                  >
                    {c.name}
                  </button>
                  <div className="text-xs text-muted">{c.email}</div>
                </td>
                <td className="p-3">
                  {c.governorate && isGovernorate(c.governorate) ? (
                    tg(c.governorate)
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="p-3">{f.number(c.orders, "integer")}</td>
                <td className="p-3 font-medium">
                  <Price cents={c.spentCents} />
                </td>
                <td className="p-3">
                  {c.lastPurchase ? (
                    f.dateTime(new Date(c.lastPurchase), "date")
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="hidden p-3 lg:table-cell">
                  {f.dateTime(new Date(c.joined), "date")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isError && (
          <div role="alert" className="p-6 text-center">
            <p className="mb-3">{t("loadError")}</p>
            <button
              onClick={() => refetch()}
              className={buttonVariants({ variant: "primary", size: "md" })}
            >
              {tc("retry")}
            </button>
          </div>
        )}
        {!isLoading && !isError && data?.items.length === 0 && (
          <div className="p-10 text-center">
            <p className="mb-3">{t("empty")}</p>
            {params.has("q") && (
              <button
                onClick={() => clear(["sort", "dir"])}
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                {t("clearSearch")}
              </button>
            )}
          </div>
        )}
      </div>

      {data && (
        <div className="flex items-center justify-between text-sm">
          <p aria-live="polite">
            {t("pagination.summary", { total: data.total, page: data.page, pages: data.pageCount })}
          </p>
          <div className="flex gap-2">
            <button
              disabled={data.page <= 1}
              onClick={() => patch({ page: data.page - 1 })}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "disabled:opacity-40",
              )}
            >
              {t("pagination.prev")}
            </button>
            <button
              disabled={data.page >= data.pageCount}
              onClick={() => patch({ page: data.page + 1 })}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "disabled:opacity-40",
              )}
            >
              {t("pagination.next")}
            </button>
          </div>
        </div>
      )}
      {openId && <CustomerPanel id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
