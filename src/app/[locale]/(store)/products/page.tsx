import { inputVariants } from "@/components/ui/field";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { ProductCard, ProductGridSkeleton } from "@/components/store/product-card";
import { Link } from "@/i18n/navigation";
import { currentLocale, pinLocale } from "@/i18n/server";
import { getPriceBounds, listCategories, listProducts, PAGE_SIZE } from "@/lib/services/products";
import { TASTING_NOTES } from "@/lib/tasting-notes";
import { productQuerySchema, ROASTS, SORTS, type ProductQuery } from "@/lib/validations/products";
import { PriceRange } from "./price-range";

export async function generateMetadata({ params }: PageProps<"/[locale]/products">) {
  const locale = await pinLocale(params);
  const t = await getTranslations({ locale, namespace: "Store.catalog" });
  return { title: t("title") };
}

/** A catalog URL for the same filters with some of them changed. Arrays become repeated params. */
function href(query: ProductQuery, patch: Partial<Record<keyof ProductQuery, unknown>>) {
  const merged: Record<string, unknown> = { ...query, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (
      v === undefined ||
      v === "" ||
      (Array.isArray(v) && v.length === 0) ||
      (k === "page" && v === 1) ||
      (k === "sort" && v === "newest")
    )
      continue;
    if (Array.isArray(v)) for (const item of v) sp.append(k, String(item));
    else sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}

const input = cn(inputVariants(), "w-full");

async function Filters({ query }: { query: ProductQuery }) {
  const [categories, bounds] = await Promise.all([
    listCategories(await currentLocale()),
    getPriceBounds(),
  ]);
  const t = await getTranslations("Store.catalog");
  const tRoast = await getTranslations("Common.roast");
  const tNotes = await getTranslations("Common.tastingNotes");
  const locale = await getLocale();
  return (
    <>
      {/* phones: the filters open as a bottom sheet (CSS-only, so it works before hydration) */}
      <input
        type="checkbox"
        id="filters-toggle"
        aria-label={t("showFilters")}
        className="peer sr-only md:hidden"
      />
      <label
        htmlFor="filters-toggle"
        className="mb-3 block cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-accent md:hidden"
      >
        {t("filtersToggle")}
      </label>
      <label
        htmlFor="filters-toggle"
        aria-hidden
        className="fixed inset-0 z-40 hidden bg-black/40 peer-checked:block md:!hidden"
      />
      <form
        method="get"
        action={`/${locale}/products`}
        className="hidden space-y-4 text-sm peer-checked:fixed peer-checked:inset-x-0 peer-checked:bottom-0 peer-checked:z-50 peer-checked:block peer-checked:max-h-[85vh] peer-checked:overflow-y-auto peer-checked:rounded-t-2xl peer-checked:border-t peer-checked:border-border peer-checked:bg-card peer-checked:p-5 md:static md:z-auto md:block md:max-h-none md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0"
        role="search"
      >
        <div>
          <label htmlFor="q" className="mb-1 block font-medium">
            {t("search")}
          </label>
          <input
            id="q"
            name="q"
            defaultValue={query.q}
            placeholder={t("searchPlaceholder")}
            className={input}
          />
        </div>
        <fieldset>
          <legend className="mb-1 font-medium">{t("category")}</legend>
          <div className="space-y-1">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="category"
                  value={c.slug}
                  defaultChecked={query.category?.includes(c.slug)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="roast" className="mb-1 block font-medium">
            {t("roast")}
          </label>
          <select id="roast" name="roast" defaultValue={query.roast ?? ""} className={input}>
            <option value="">{t("all")}</option>
            {ROASTS.map((r) => (
              <option key={r} value={r}>
                {tRoast(r)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="note" className="mb-1 block font-medium">
            {t("taste")}
          </label>
          <select id="note" name="note" defaultValue={query.note ?? ""} className={input}>
            <option value="">{t("all")}</option>
            {TASTING_NOTES.map((n) => (
              <option key={n} value={n}>
                {tNotes(n)}
              </option>
            ))}
          </select>
        </div>
        <PriceRange bounds={bounds} min={query.min} max={query.max} />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="inStock" value="1" defaultChecked={!!query.inStock} />
          {t("inStockOnly")}
        </label>
        <div>
          <label htmlFor="sort" className="mb-1 block font-medium">
            {t("sort")}
          </label>
          <select id="sort" name="sort" defaultValue={query.sort} className={input}>
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`sorts.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className={cn(buttonVariants({ variant: "primary", size: "md" }), "flex-1")}
          >
            {t("apply")}
          </button>
          <Link href="/products" className={buttonVariants({ variant: "secondary", size: "md" })}>
            {t("clear")}
          </Link>
        </div>
      </form>
    </>
  );
}

/** One removable chip per active filter, so what is narrowing the list is always visible. */
async function ActiveFilters({ query }: { query: ProductQuery }) {
  const t = await getTranslations("Store.catalog");
  const tRoast = await getTranslations("Common.roast");
  const tNotes = await getTranslations("Common.tastingNotes");
  const categories = await listCategories(await currentLocale());
  const chips: { key: string; label: string; to: string }[] = [];
  if (query.q)
    chips.push({ key: "q", label: `“${query.q}”`, to: href(query, { q: undefined, page: 1 }) });
  for (const slug of query.category ?? []) {
    const name = categories.find((c) => c.slug === slug)?.name ?? slug;
    chips.push({
      key: `c-${slug}`,
      label: name,
      to: href(query, { category: query.category?.filter((x) => x !== slug), page: 1 }),
    });
  }
  if (query.roast)
    chips.push({
      key: "roast",
      label: tRoast(query.roast),
      to: href(query, { roast: undefined, page: 1 }),
    });
  if (query.note)
    chips.push({
      key: "note",
      label: tNotes(query.note),
      to: href(query, { note: undefined, page: 1 }),
    });
  if (query.min !== undefined)
    chips.push({
      key: "min",
      label: t("chipMin", { value: query.min }),
      to: href(query, { min: undefined, page: 1 }),
    });
  if (query.max !== undefined)
    chips.push({
      key: "max",
      label: t("chipMax", { value: query.max }),
      to: href(query, { max: undefined, page: 1 }),
    });
  if (query.inStock)
    chips.push({
      key: "stock",
      label: t("inStockOnly"),
      to: href(query, { inStock: undefined, page: 1 }),
    });
  if (!chips.length) return null;
  return (
    <ul className="mb-3 flex flex-wrap items-center gap-2" aria-label={t("activeFilters")}>
      {chips.map((c) => (
        <li key={c.key}>
          <Link
            href={c.to as never}
            aria-label={t("removeFilter", { name: c.label })}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm"
          >
            {c.label}
            <span aria-hidden>×</span>
          </Link>
        </li>
      ))}
      <li>
        <Link href="/products" className="text-sm underline">
          {t("clearAll")}
        </Link>
      </li>
    </ul>
  );
}

const GRID = "grid-cols-2 sm:grid-cols-3";

/** Same footprint as the real results (count line + grid) so swapping them in doesn't shift the page. */
function ResultsSkeleton() {
  return (
    <>
      <div className="mb-3 h-5" />
      <ProductGridSkeleton count={PAGE_SIZE} columns={GRID} />
    </>
  );
}

/** Same two-column frame as <Catalog>, shown while the search params resolve. */
function CatalogSkeleton() {
  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <div className="h-10 animate-pulse rounded bg-border md:h-[28rem]" />
      <section>
        <ResultsSkeleton />
      </section>
    </div>
  );
}

async function Results({ query }: { query: ProductQuery }) {
  const { items, total, page, pageCount, suggestion } = await listProducts(
    query,
    await currentLocale(),
  );
  const t = await getTranslations("Store.catalog");

  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="mb-4">{t("empty")}</p>
        <Link href="/products" className={buttonVariants({ variant: "primary", size: "md" })}>
          {t("clearFilters")}
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 min-h-5 text-sm text-muted">
        {suggestion && (
          <span className="me-2 text-foreground">{t("showingFor", { term: suggestion })}</span>
        )}
        {t("count", { count: total })}
      </p>
      <div className={`grid gap-4 ${GRID}`}>
        {items.map((p, i) => (
          <ProductCard key={p.id} p={p} headingAs="h2" priority={i < 4} />
        ))}
      </div>
      {pageCount > 1 && (
        <nav aria-label={t("pages")} className="mt-8 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={href(query, { page: n }) as never}
              aria-current={n === page ? "page" : undefined}
              className={`rounded-md border px-3 py-1 ${
                n === page ? "border-accent bg-accent text-accent-fg" : "border-border"
              }`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

async function Catalog({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/products">["searchParams"];
}) {
  const t = await getTranslations("Store.catalog");
  const raw = await searchParams;
  // repeated params (category=a&category=b) stay arrays; every other field takes its first value
  const query = productQuerySchema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, k === "category" ? v : Array.isArray(v) ? v[0] : v]),
    ),
  );
  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <aside>
        <Suspense fallback={<div className="h-10 animate-pulse rounded bg-border md:h-[28rem]" />}>
          <Filters query={query} />
        </Suspense>
      </aside>
      <section aria-label={t("results")}>
        <Suspense>
          <ActiveFilters query={query} />
        </Suspense>
        <Suspense key={JSON.stringify(query)} fallback={<ResultsSkeleton />}>
          <Results query={query} />
        </Suspense>
      </section>
    </div>
  );
}

export default async function ProductsPage(props: PageProps<"/[locale]/products">) {
  await pinLocale(props.params);
  return <ProductsContent searchParams={props.searchParams} />;
}

function ProductsContent({
  searchParams,
}: {
  searchParams: PageProps<"/[locale]/products">["searchParams"];
}) {
  const t = useTranslations("Store.catalog");
  return (
    <main>
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
