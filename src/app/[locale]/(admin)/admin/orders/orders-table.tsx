"use client";

import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Price } from "@/components/price";
import { useErrorText } from "@/hooks/use-error-text";
import { Link } from "@/i18n/navigation";
import type { ApiErrorBody, ErrorCode, ErrorParams } from "@/lib/api-error";
import { useDebouncedParam } from "@/hooks/use-debounced-param";
import { confirmDialog } from "@/hooks/use-confirm";
import { toast } from "@/hooks/use-toast";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  type SortingState,
  type VisibilityState,
  useReactTable,
} from "@tanstack/react-table";
import { PaymentBadge, StatusBadge } from "@/components/patterns/status-badge";
import { GOVERNORATES } from "@/lib/geo";
import { useUrlState } from "@/hooks/use-url-state";
import {
  ORDER_STATUSES,
  PAGE_SIZES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/validations/admin-orders";

type Row = {
  id: string;
  orderNumber: number;
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  governorate: string | null;
  totalCents: number;
  customerName: string;
  customerEmail: string;
  itemCount: number;
};
type Result = { items: Row[]; total: number; page: number; pageSize: number; pageCount: number };

const input = inputVariants({ size: "sm" });

const COLUMN_IDS = [
  "orderNumber",
  "createdAt",
  "customer",
  "governorate",
  "items",
  "status",
  "payment",
  "totalCents",
] as const;
const BULK_STATUSES = ["SHIPPED", "DELIVERED", "CANCELLED"] as const;
const FILTER_KEYS = [
  "q",
  "from",
  "to",
  "status",
  "payment",
  "method",
  "governorate",
  "minTotal",
  "maxTotal",
  "category",
  "product",
];

// tiny localStorage-backed store so column choices survive reloads without hydration mismatches
const listeners = new Set<() => void>();
function useStoredList(key: string): [string[], (v: string[]) => void] {
  const raw = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => {
      try {
        return localStorage.getItem(key) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  const value = useMemo<string[]>(() => {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }, [raw]);
  return [
    value,
    (v) => {
      try {
        localStorage.setItem(key, JSON.stringify(v));
      } catch {}
      listeners.forEach((l) => l());
    },
  ];
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

function presets() {
  const today = new Date();
  const daysAgo = (n: number) => iso(new Date(today.getTime() - n * 86_400_000));
  return [
    { key: "last7", from: daysAgo(7), to: iso(today) },
    {
      key: "thisMonth",
      from: iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))),
      to: iso(today),
    },
    { key: "last90", from: daysAgo(90), to: iso(today) },
  ] as const;
}

export function OrdersTable({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations("Admin.orders");
  const tStatus = useTranslations("Common.status");
  const tPay = useTranslations("Common.paymentStatus");
  const tMethod = useTranslations("Common.paymentMethod");
  const tGov = useTranslations("Common.governorates");
  const tc = useTranslations("Common");
  const text = useErrorText();
  const f = useFormatter();
  const { params, patch, clear: clearUrl } = useUrlState();
  const qs = params.toString();
  const queryClient = useQueryClient();
  const [hiddenCols, setHiddenCols] = useStoredList("orders-hidden-columns");

  // selection belongs to the page it was made on: a different query clears it
  const [selection, setSelection] = useState<{ qs: string; ids: string[] }>({ qs, ids: [] });
  const selected = selection.qs === qs ? selection.ids : [];
  const setSelected = (ids: string[]) => setSelection({ qs, ids });
  const [bulkStatus, setBulkStatus] = useState<string>(BULK_STATUSES[0]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    changed: number;
    skipped: { code?: ErrorCode; params?: ErrorParams }[];
  }>();

  // search box: type freely, push to the URL after a short pause
  const search = useDebouncedParam(params.get("q") ?? "", (q) => patch({ q }));
  const clear = (keep: string[]) => {
    search.reset();
    clearUrl(keep);
  };

  const { data, isLoading, isFetching, isError, refetch, dataUpdatedAt } = useQuery<Result>({
    queryKey: ["admin-orders", qs],
    placeholderData: keepPreviousData,
    refetchInterval: 30_000, // new orders show up without a manual refresh
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders?${qs}`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const sort = params.get("sort") ?? "createdAt:desc";
  const sorting: SortingState = useMemo(() => {
    const [id, dir] = sort.split(":");
    return [{ id, desc: dir === "desc" }];
  }, [sort]);

  const allIds = data?.items.map((r) => r.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id));

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      ...(canEdit
        ? ([
            {
              id: "select",
              enableSorting: false,
              enableHiding: false,
              header: "",
              cell: () => null, // rendered below (needs selection state)
            },
          ] as ColumnDef<Row>[])
        : []),
      {
        id: "orderNumber",
        header: t("columns.orderNumber"),
        cell: ({ row }) => (
          <Link href={`/admin/orders/${row.original.id}`} className="font-medium underline">
            #{row.original.orderNumber}
          </Link>
        ),
      },
      {
        id: "createdAt",
        header: t("columns.createdAt"),
        cell: ({ row }) => f.dateTime(new Date(row.original.createdAt), "date"),
      },
      {
        id: "customer",
        header: t("columns.customer"),
        cell: ({ row }) => (
          <div>
            <div>{row.original.customerName}</div>
            <div className="text-xs text-muted">{row.original.customerEmail}</div>
          </div>
        ),
      },
      {
        id: "governorate",
        header: t("columns.governorate"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.governorate &&
          (GOVERNORATES as readonly string[]).includes(row.original.governorate)
            ? tGov(row.original.governorate as (typeof GOVERNORATES)[number])
            : "—",
      },
      {
        id: "items",
        header: t("columns.items"),
        enableSorting: false,
        cell: ({ row }) => f.number(row.original.itemCount, "integer"),
      },
      {
        id: "status",
        header: t("columns.status"),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "payment",
        header: t("columns.payment"),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <PaymentBadge status={row.original.paymentStatus} />
            <div className="text-xs text-muted">
              {tMethod(row.original.paymentMethod as (typeof PAYMENT_METHODS)[number])}
            </div>
          </div>
        ),
      },
      {
        id: "totalCents",
        header: t("columns.totalCents"),
        cell: ({ row }) => <Price cents={row.original.totalCents} />,
      },
    ],
    [canEdit, t, f, tGov, tMethod],
  );

  const columnVisibility: VisibilityState = Object.fromEntries(hiddenCols.map((c) => [c, false]));
  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: { sorting, columnVisibility },
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (r) => r.id,
  });

  const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const selectedStatuses = list("status");
  const selectedPayments = list("payment");
  const selectedMethods = list("method");
  const selectedGovs = list("governorate");
  const toggle = (key: string, current: string[], value: string, on: boolean) =>
    patch({ [key]: on ? [...current, value] : current.filter((x) => x !== value) });
  const hasFilters = FILTER_KEYS.some((k) => params.has(k));
  const drop = (key: string, current: string[], value: string) =>
    patch({ [key]: current.filter((x) => x !== value) });
  const chips: { key: string; label: string; remove: () => void }[] = [
    ...(params.get("q")
      ? [{ key: "q", label: `“${params.get("q")}”`, remove: () => search.reset() }]
      : []),
    ...(params.get("from")
      ? [
          {
            key: "from",
            label: `${t("filters.from")} ${params.get("from")}`,
            remove: () => patch({ from: undefined }),
          },
        ]
      : []),
    ...(params.get("to")
      ? [
          {
            key: "to",
            label: `${t("filters.to")} ${params.get("to")}`,
            remove: () => patch({ to: undefined }),
          },
        ]
      : []),
    ...selectedStatuses.map((v) => ({
      key: `s-${v}`,
      label: tStatus(v as never),
      remove: () => drop("status", selectedStatuses, v),
    })),
    ...selectedPayments.map((v) => ({
      key: `p-${v}`,
      label: tPay(v as never),
      remove: () => drop("payment", selectedPayments, v),
    })),
    ...selectedMethods.map((v) => ({
      key: `m-${v}`,
      label: tMethod(v as never),
      remove: () => drop("method", selectedMethods, v),
    })),
    ...selectedGovs.map((v) => ({
      key: `g-${v}`,
      label: tGov(v as never),
      remove: () => drop("governorate", selectedGovs, v),
    })),
    ...(params.get("minTotal")
      ? [
          {
            key: "min",
            label: `${t("filters.minTotal")}: ${params.get("minTotal")}`,
            remove: () => patch({ minTotal: undefined }),
          },
        ]
      : []),
    ...(params.get("maxTotal")
      ? [
          {
            key: "max",
            label: `${t("filters.maxTotal")}: ${params.get("maxTotal")}`,
            remove: () => patch({ maxTotal: undefined }),
          },
        ]
      : []),
    ...(["category", "product"] as const)
      .filter((k) => params.get(k))
      .map((k) => ({
        key: k,
        label: `${t(`filters.${k}`)}: ${params.get(k)}`,
        remove: () => patch({ [k]: undefined }),
      })),
  ];
  const pageSize = Number(params.get("pageSize") ?? 25);

  // export = the same filters, without paging/sorting
  const exportQs = new URLSearchParams(
    FILTER_KEYS.filter((k) => params.has(k)).map((k) => [k, params.get(k)!]),
  ).toString();

  async function applyBulk() {
    const ok = await confirmDialog({
      title: t("bulk.confirmTitle"),
      message: t("bulk.confirmMessage", {
        count: selected.length,
        status: tStatus(bulkStatus as (typeof BULK_STATUSES)[number]),
      }),
      confirmLabel: t("bulk.apply"),
      danger: ["CANCELLED", "REFUNDED"].includes(bulkStatus),
    });
    if (!ok) return;
    setBulkBusy(true);
    setBulkResult(undefined);
    const res = await fetch("/api/admin/orders/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected, status: bulkStatus }),
    });
    setBulkBusy(false);
    if (!res.ok) {
      setBulkResult({
        changed: 0,
        skipped: [{ code: ((await res.json()) as ApiErrorBody).error?.code }],
      });
      return;
    }
    const body = await res.json();
    setBulkResult({ changed: body.changed.length, skipped: body.skipped });
    if (body.changed.length) toast.success(t("bulk.updated", { count: body.changed.length }));
    else toast.error(t("bulk.noneUpdated"));
    setSelected([]);
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
  }

  function toggleSort(id: string) {
    const [cur, dir] = sort.split(":");
    patch({ sort: cur === id && dir === "desc" ? `${id}:asc` : `${id}:desc` });
  }

  return (
    <div className="space-y-4">
      {/* filters */}
      <input
        type="checkbox"
        id="order-filters-toggle"
        aria-label={t("filters.show")}
        className="peer sr-only md:hidden"
      />
      <label
        htmlFor="order-filters-toggle"
        className="block cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-accent md:hidden"
      >
        {t("filters.toggle")} {hasFilters && t("filters.active")}
      </label>
      <form
        role="search"
        aria-label={t("filters.label")}
        className="hidden flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 peer-checked:flex md:flex"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-xs text-muted">
            {t("filters.search")}
          </label>
          <input
            id="q"
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            className={`${input} w-56`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-xs text-muted">
            {t("filters.from")}
          </label>
          <input
            id="from"
            type="date"
            value={params.get("from") ?? ""}
            onChange={(e) => patch({ from: e.target.value })}
            className={input}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-xs text-muted">
            {t("filters.to")}
          </label>
          <input
            id="to"
            type="date"
            value={params.get("to") ?? ""}
            onChange={(e) => patch({ to: e.target.value })}
            className={input}
          />
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label={t("filters.presets")}>
          {presets().map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => patch({ from: p.from, to: p.to })}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "text-xs")}
            >
              {t(`presets.${p.key}`)}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="minTotal" className="text-xs text-muted">
            {t("filters.minTotal")}
          </label>
          <input
            id="minTotal"
            type="number"
            min={0}
            value={params.get("minTotal") ?? ""}
            onChange={(e) => patch({ minTotal: e.target.value })}
            className={`${input} w-24`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="maxTotal" className="text-xs text-muted">
            {t("filters.maxTotal")}
          </label>
          <input
            id="maxTotal"
            type="number"
            min={0}
            value={params.get("maxTotal") ?? ""}
            onChange={(e) => patch({ maxTotal: e.target.value })}
            className={`${input} w-24`}
          />
        </div>
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <legend className="mb-1 text-xs text-muted">{t("columns.status")}</legend>
          {ORDER_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={selectedStatuses.includes(s)}
                onChange={(e) =>
                  patch({
                    status: e.target.checked
                      ? [...selectedStatuses, s]
                      : selectedStatuses.filter((x) => x !== s),
                  })
                }
              />
              {tStatus(s)}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <legend className="mb-1 text-xs text-muted">{t("filters.payment")}</legend>
          {PAYMENT_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={selectedPayments.includes(s)}
                onChange={(e) => toggle("payment", selectedPayments, s, e.target.checked)}
              />
              {tPay(s)}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <legend className="mb-1 text-xs text-muted">{t("filters.method")}</legend>
          {PAYMENT_METHODS.map((m) => (
            <label key={m} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={selectedMethods.includes(m)}
                onChange={(e) => toggle("method", selectedMethods, m, e.target.checked)}
              />
              {tMethod(m)}
            </label>
          ))}
        </fieldset>
        <details className="relative">
          <summary
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "cursor-pointer")}
          >
            {t("filters.governorate")}
            {selectedGovs.length > 0 && ` (${selectedGovs.length})`}
          </summary>
          <div className="absolute start-0 z-10 mt-1 grid max-h-64 w-64 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded-md border border-border bg-card p-3 text-sm shadow">
            {GOVERNORATES.map((g) => (
              <label key={g} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={selectedGovs.includes(g)}
                  onChange={(e) => toggle("governorate", selectedGovs, g, e.target.checked)}
                />
                {tGov(g)}
              </label>
            ))}
          </div>
        </details>
        {hasFilters && (
          <button
            type="button"
            onClick={() => clear(["sort", "pageSize"])}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {t("filters.clear")}
          </button>
        )}
      </form>

      {/* every active filter as a chip that removes itself, plus "clear all" */}
      {hasFilters && (
        <ul
          className="flex flex-wrap items-center gap-2 text-sm"
          aria-label={t("filters.activeLabel")}
        >
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={c.remove}
                aria-label={t("filters.removeChip", { name: c.label })}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1"
              >
                {c.label}
                <span aria-hidden>✕</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => clear(["sort", "pageSize"])} className="underline">
              {t("filters.clearAll")}
            </button>
          </li>
        </ul>
      )}

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {canEdit && selected.length > 0 && (
          <div
            role="group"
            aria-label={t("bulk.label")}
            className="flex flex-wrap items-center gap-2 rounded-md border border-accent bg-card px-3 py-1.5"
          >
            <span>{t("bulk.selected", { count: selected.length })}</span>
            <label htmlFor="bulk-status" className="sr-only">
              {t("bulk.newStatus")}
            </label>
            <select
              id="bulk-status"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className={input}
            >
              {BULK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {tStatus(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={applyBulk}
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              {bulkBusy ? t("bulk.applying") : t("bulk.applySelected")}
            </button>
            <button type="button" onClick={() => setSelected([])} className="underline">
              {t("bulk.clearSelection")}
            </button>
          </div>
        )}
        {bulkResult && (
          <p role="status" className={bulkResult.skipped.length ? "text-warning" : "text-success"}>
            {t("bulk.result", { count: bulkResult.changed })}
            {bulkResult.skipped.length > 0 &&
              ` — ${t("bulk.skipped", {
                count: bulkResult.skipped.length,
                reasons: [...new Set(bulkResult.skipped.map((s) => text.api(s)))].join(
                  tc("listSeparator"),
                ),
              })}`}
          </p>
        )}

        <div className="ms-auto flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-muted">
              {t("lastUpdated", { time: f.dateTime(new Date(dataUpdatedAt), "time") })}
            </span>
          )}
          <details className="relative">
            <summary
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "cursor-pointer")}
            >
              {t("columnsMenu")}
            </summary>
            <div className="absolute end-0 z-10 mt-1 w-40 space-y-1 rounded-md border border-border bg-card p-2 shadow">
              {COLUMN_IDS.map((id) => (
                <label key={id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!hiddenCols.includes(id)}
                    onChange={(e) =>
                      setHiddenCols(
                        e.target.checked ? hiddenCols.filter((c) => c !== id) : [...hiddenCols, id],
                      )
                    }
                  />
                  {t(`columns.${id}`)}
                </label>
              ))}
            </div>
          </details>
          <a
            target="_blank" // new tab: see the note on the analytics export links
            rel="noopener"
            href={`/api/admin/export/orders${exportQs ? `?${exportQs}` : ""}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {t("exportCsv")}
          </a>
        </div>
      </div>

      {/* table */}
      <div
        className="overflow-x-auto rounded-lg border border-border bg-card"
        aria-busy={isFetching}
      >
        <table className="w-full text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <thead className="bg-border/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sortable = h.column.columnDef.enableSorting !== false;
                  const active = sorting[0]?.id === h.id;
                  return (
                    <th
                      key={h.id}
                      scope="col"
                      aria-sort={
                        active
                          ? sorting[0].desc
                            ? "descending"
                            : "ascending"
                          : sortable
                            ? "none"
                            : undefined
                      }
                      className={`p-3 text-start font-medium ${["items", "customer", "governorate"].includes(h.id) ? "hidden md:table-cell" : ""}`}
                    >
                      {h.id === "select" ? (
                        <input
                          type="checkbox"
                          aria-label={t("selectAll")}
                          checked={allSelected}
                          onChange={(e) => setSelected(e.target.checked ? allIds : [])}
                        />
                      ) : sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(h.id)}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span aria-hidden>{active ? (sorting[0].desc ? "▼" : "▲") : "↕"}</span>
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className={isFetching && !isLoading ? "opacity-60" : ""}>
            {isLoading &&
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={columns.length} className="p-3">
                    <div className="h-5 animate-pulse rounded bg-border" />
                  </td>
                </tr>
              ))}
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-border/30">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`p-3 ${["items", "customer", "governorate"].includes(cell.column.id) ? "hidden md:table-cell" : ""}`}
                  >
                    {cell.column.id === "select" ? (
                      <input
                        type="checkbox"
                        aria-label={t("selectOne", { number: row.original.orderNumber })}
                        checked={selected.includes(row.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, row.id]
                              : selected.filter((id) => id !== row.id),
                          )
                        }
                      />
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </td>
                ))}
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
            {hasFilters && (
              <button
                onClick={() => clear(["sort", "pageSize"])}
                className={buttonVariants({ variant: "primary", size: "md" })}
              >
                {t("filters.clear")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* pagination */}
      {data && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p aria-live="polite">
            {t("pagination.summary", {
              total: data.total,
              page: data.page,
              pages: data.pageCount,
              from: (data.page - 1) * pageSize + 1,
              to: Math.min(data.page * pageSize, data.total),
            })}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="pageSize" className="text-muted">
              {t("pagination.rows")}
            </label>
            <select
              id="pageSize"
              value={pageSize}
              onChange={(e) => patch({ pageSize: e.target.value })}
              className={input}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
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
    </div>
  );
}
